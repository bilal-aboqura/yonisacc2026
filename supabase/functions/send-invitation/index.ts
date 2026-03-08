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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { email, role, companyId, allowedModules } = await req.json();

    if (!email || !role || !companyId) {
      return new Response(
        JSON.stringify({ error: "email, role, and companyId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns this company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .select("id, name, name_en, owner_id")
      .eq("id", companyId)
      .eq("owner_id", userId)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Company not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email is already a member
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const targetUser = existingUser?.users?.find((u) => u.email === email);

    if (targetUser) {
      const { data: existingMember } = await adminClient
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "User is already a member of this company" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await adminClient
      .from("invitations")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "A pending invitation already exists for this email" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const rawToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Save invitation with allowed_modules
    const { error: insertError } = await adminClient.from("invitations").insert({
      company_id: companyId,
      email,
      role,
      token_hash: tokenHash,
      invited_by: userId,
      status: "pending",
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      allowed_modules: allowedModules || null,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Resend API key
    const { data: resendSetting } = await adminClient
      .from("owner_settings")
      .select("setting_value")
      .eq("setting_key", "resend_api_key")
      .maybeSingle();

    const resendApiKey = (resendSetting?.setting_value as any)?.api_key;

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          message: "Invitation created but email not sent - Resend API key not configured",
          inviteLink: `${req.headers.get("origin") || "https://yonisacc2026.lovable.app"}/invite/accept?token=${rawToken}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    const inviterName = inviterProfile?.full_name || "Admin";
    const companyName = company.name_en || company.name;
    const acceptUrl = `${req.headers.get("origin") || "https://yonisacc2026.lovable.app"}/invite/accept?token=${rawToken}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Costamine <noreply@costamine.com>",
        to: [email],
        subject: `You've been invited to join ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a1a; margin-bottom: 5px;">Costamine</h1>
              <p style="color: #666;">Accounting & ERP Platform</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">You're Invited! 🎉</h2>
              <p style="color: #333; font-size: 16px;">
                <strong>${inviterName}</strong> has invited you to join 
                <strong>${companyName}</strong> as <strong>${role}</strong>.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" 
                   style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; 
                          padding: 14px 32px; border-radius: 8px; text-decoration: none; 
                          font-weight: bold; font-size: 16px; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">This invitation will expire in 48 hours.</p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    const emailSent = emailResponse.ok;

    return new Response(
      JSON.stringify({ success: true, emailSent, inviteLink: acceptUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-invitation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
