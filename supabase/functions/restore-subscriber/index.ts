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

    // Verify caller is an owner
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check caller has owner role
    const { data: ownerRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", callerUser.id)
      .eq("role", "owner")
      .maybeSingle();

    if (!ownerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: Owner role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companyId, newPassword } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the archived company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .select("id, owner_id, name, email")
      .eq("id", companyId)
      .not("deleted_at", "is", null)
      .maybeSingle();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Archived company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = company.owner_id;

    // Check if the auth user still exists
    let authUserExists = false;
    let userEmail = "";
    try {
      const { data: authUser, error: getUserError } = await adminClient.auth.admin.getUserById(ownerId);
      if (!getUserError && authUser?.user) {
        authUserExists = true;
        userEmail = authUser.user.email || "";
      }
    } catch (_e) {
      authUserExists = false;
    }

    if (authUserExists) {
      // User exists, just update password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(ownerId, {
        password: newPassword,
      });
      if (updateError) {
        console.error("Password update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update password" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Auth user was deleted, get email from profile
      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name, phone_number")
        .eq("user_id", ownerId)
        .maybeSingle();

      // Get the email from the company or profile
      userEmail = company.email || "";
      if (!userEmail) {
        return new Response(JSON.stringify({ error: "Cannot restore: no email found for this account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Re-create auth user with same ID
      const { error: createError } = await adminClient.auth.admin.createUser({
        id: ownerId,
        email: userEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: profile?.full_name || "",
        },
      });

      if (createError) {
        console.error("Auth user recreation error:", createError);
        // If email already taken by another user
        if (createError.message?.includes("already") || createError.message?.includes("duplicate")) {
          return new Response(JSON.stringify({ 
            error: "Email is already in use by another account",
            error_ar: "البريد الإلكتروني مستخدم من حساب آخر" 
          }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Failed to recreate auth user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 1. Restore company (clear deleted_at)
    await adminClient
      .from("companies")
      .update({ deleted_at: null })
      .eq("id", companyId);

    // 2. Restore profile
    await adminClient
      .from("profiles")
      .update({ deleted_at: null, is_active: true })
      .eq("user_id", ownerId);

    // 3. Reactivate company membership for the owner
    await adminClient
      .from("company_members")
      .update({ is_active: true })
      .eq("company_id", companyId)
      .eq("user_id", ownerId);

    // 4. Reactivate the latest subscription as trialing (14-day trial)
    const { data: latestSub } = await adminClient
      .from("subscriptions")
      .select("id, plan_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSub) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 14);

      await adminClient
        .from("subscriptions")
        .update({
          status: "trialing",
          start_date: now.toISOString(),
          end_date: trialEnd.toISOString(),
        } as any)
        .eq("id", latestSub.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscriber restored successfully",
        email: userEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in restore-subscriber:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
