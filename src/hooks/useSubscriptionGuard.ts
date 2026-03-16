import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SubscriptionStatus = "loading" | "allowed" | "blocked" | "no_company";

// pending = new company created but subscription not yet activated (treat as allowed)
// trialing = free trial (added to enum via migration)
// active = paid and active subscription
const ALLOWED_STATUSES = ["active", "trialing", "pending"];

export const useSubscriptionGuard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    status: string;
    endDate: string | null;
    planName: string | null;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("loading");
      return;
    }

    const checkSubscription = async () => {
      let companyId: string | null = null;

      // 1. Check as owner
      const { data: owned } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (owned) {
        companyId = owned.id;
      } else {
        // 2. Check as team member
        const { data: membership } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        companyId = membership?.company_id ?? null;
      }

      if (!companyId) {
        setStatus("no_company");
        return;
      }

      // Get active subscription
      const { data: subs, error: subError } = await supabase
        .from("subscriptions")
        .select(`
          status,
          end_date,
          plan:subscription_plans(name_ar, name_en)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1);

      // If there's a permissions error (RLS), don't block — allow access
      // This prevents lockout due to misconfigured RLS policies
      if (subError) {
        const errCode = (subError as any)?.code;
        // PGRST301 = insufficient privilege (RLS), 42501 = permission denied
        if (errCode === "PGRST301" || errCode === "42501") {
          console.warn("Subscription check: RLS permission error, allowing access:", subError.message);
          setStatus("allowed");
          return;
        }
        // Other errors (network, etc.) — allow with warning
        console.warn("Subscription check error, allowing access:", subError.message);
        setStatus("allowed");
        return;
      }

      if (!subs?.length) {
        setStatus("blocked");
        setSubscriptionInfo({ status: "none", endDate: null, planName: null });
        return;
      }

      const sub = subs[0];
      const subStatus = sub.status as string;

      setSubscriptionInfo({
        status: subStatus,
        endDate: sub.end_date,
        planName: (sub.plan as any)?.name_en || (sub.plan as any)?.name_ar || null,
      });

      if (ALLOWED_STATUSES.includes(subStatus)) {
        setStatus("allowed");
      } else {
        setStatus("blocked");
      }
    };

    checkSubscription();
  }, [user, authLoading]);

  return { status, subscriptionInfo, isLoading: status === "loading" };
};
