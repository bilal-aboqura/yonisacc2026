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

    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company and its owner
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .select("id, owner_id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = company.owner_id;

    // 1. Soft-delete the company
    await adminClient
      .from("companies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", companyId);

    // 2. Revoke all pending invitations for this company
    await adminClient
      .from("invitations")
      .update({ status: "revoked" })
      .eq("company_id", companyId)
      .eq("status", "pending");

    // 3. Deactivate all company memberships
    await adminClient
      .from("company_members")
      .update({ is_active: false })
      .eq("company_id", companyId);

    // 4. Terminate subscriptions
    await adminClient
      .from("subscriptions")
      .update({ status: "terminated" })
      .eq("company_id", companyId)
      .in("status", ["trialing", "active", "pending", "past_due"]);

    // 5. Soft-delete the owner's profile (keep for audit)
    await adminClient
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("user_id", ownerId);

    // 6. Check if owner has other active companies
    const { data: otherCompanies } = await adminClient
      .from("companies")
      .select("id")
      .eq("owner_id", ownerId)
      .is("deleted_at", null);

    // 7. If no other active companies, delete the auth user (frees the email)
    if (!otherCompanies || otherCompanies.length === 0) {
      // Revoke all sessions first
      try {
        await adminClient.auth.admin.signOut(ownerId, "global");
      } catch (e) {
        console.log("Session revocation note:", e);
      }

      // Delete from auth.users to free the email for re-registration
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(ownerId);
      if (deleteAuthError) {
        console.error("Auth user deletion error:", deleteAuthError);
        // Not fatal - company is already soft-deleted
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscriber deleted successfully",
        emailFreed: !otherCompanies || otherCompanies.length === 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-subscriber:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
