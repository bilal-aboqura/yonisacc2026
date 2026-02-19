import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SubscriptionStatus = "loading" | "allowed" | "blocked" | "no_company";

const ALLOWED_STATUSES = ["active", "trialing"];

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
      // Get user's company
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (companyError || !companies?.length) {
        setStatus("no_company");
        return;
      }

      const companyId = companies[0].id;

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

      if (subError || !subs?.length) {
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
