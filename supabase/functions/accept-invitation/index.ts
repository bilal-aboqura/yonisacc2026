import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "GET") {
      // Validate token (called when user opens the accept page)
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        return new Response(JSON.stringify({ error: "Token is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hash the provided token
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Find invitation
      const { data: invitation, error } = await adminClient
        .from("invitations")
        .select("id, email, role, status, expires_at, company_id, companies(name, name_en)")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (error || !invitation) {
        return new Response(JSON.stringify({ error: "Invalid invitation token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invitation.status === "accepted") {
        return new Response(JSON.stringify({ error: "Invitation already accepted", status: "accepted" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invitation.status === "revoked") {
        return new Response(JSON.stringify({ error: "Invitation has been cancelled", status: "revoked" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        // Auto-update status to expired
        await adminClient
          .from("invitations")
          .update({ status: "expired" })
          .eq("id", invitation.id);

        return new Response(JSON.stringify({ error: "Invitation has expired", status: "expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const company = invitation.companies as any;

      return new Response(
        JSON.stringify({
          valid: true,
          email: invitation.email,
          role: invitation.role,
          companyName: company?.name_en || company?.name || "Unknown",
          companyNameAr: company?.name || "غير معروف",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      // Accept the invitation and create user
      const { token, fullName, phone, password } = await req.json();

      if (!token || !fullName || !password) {
        return new Response(
          JSON.stringify({ error: "token, fullName, and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash token
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Find and validate invitation
      const { data: invitation, error: inviteError } = await adminClient
        .from("invitations")
        .select("id, email, role, status, expires_at, company_id, invited_by")
        .eq("token_hash", tokenHash)
        .eq("status", "pending")
        .maybeSingle();

      if (inviteError || !invitation) {
        return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await adminClient
          .from("invitations")
          .update({ status: "expired" })
          .eq("id", invitation.id);

        return new Response(JSON.stringify({ error: "Invitation has expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if phone is unique (if provided)
      if (phone) {
        const { data: existingPhone } = await adminClient
          .from("profiles")
          .select("id")
          .or(`phone.eq.${phone},phone_number.eq.${phone}`)
          .maybeSingle();

        if (existingPhone) {
          return new Response(
            JSON.stringify({ error: "Phone number is already in use" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Create user via admin API (auto-confirmed)
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) {
        // If user already exists, try to link them
        if (createError.message?.includes("already been registered")) {
          const { data: existingUsers } = await adminClient.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(
            (u) => u.email === invitation.email
          );

          if (existingUser) {
            // Add to company
            const { error: memberError } = await adminClient
              .from("company_members")
              .insert({
                company_id: invitation.company_id,
                user_id: existingUser.id,
                role: invitation.role,
                invited_by: invitation.invited_by,
              });

            if (memberError && !memberError.message?.includes("duplicate")) {
              console.error("Member insert error:", memberError);
              return new Response(
                JSON.stringify({ error: "Failed to add user to company" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Assign role
            await adminClient.from("user_roles").insert({
              user_id: existingUser.id,
              role: invitation.role,
            }).select();

            // Mark invitation as accepted
            await adminClient
              .from("invitations")
              .update({ status: "accepted", accepted_at: new Date().toISOString() })
              .eq("id", invitation.id);

            return new Response(
              JSON.stringify({
                success: true,
                message: "Existing user added to company. Please sign in.",
                existingUser: true,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: createError.message || "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newUserId = newUser.user.id;

      // Update profile with phone
      if (phone) {
        await adminClient
          .from("profiles")
          .update({ phone, phone_number: phone })
          .eq("user_id", newUserId);
      }

      // Add user to company_members
      await adminClient.from("company_members").insert({
        company_id: invitation.company_id,
        user_id: newUserId,
        role: invitation.role,
        invited_by: invitation.invited_by,
      });

      // Assign role
      await adminClient
        .from("user_roles")
        .insert({ user_id: newUserId, role: invitation.role })
        .select();

      // Mark invitation as accepted
      await adminClient
        .from("invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully",
          email: invitation.email,
          existingUser: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in accept-invitation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
