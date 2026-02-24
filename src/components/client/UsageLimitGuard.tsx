import { useState, useEffect } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useLanguage } from "@/hooks/useLanguage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UsageLimitGuardProps {
  usageType: "journal_entries" | "sales_invoices" | "purchase_invoices";
  children: React.ReactNode;
}

const UsageLimitGuard = ({ usageType, children }: UsageLimitGuardProps) => {
  const { checkUsageLimit, isLoading } = useFeatureAccess();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [limitCheck, setLimitCheck] = useState<{
    allowed: boolean;
    current: number;
    limit: number | null;
    unlimited: boolean;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    const check = async () => {
      const result = await checkUsageLimit(usageType);
      setLimitCheck(result);
      setChecking(false);
    };
    check();
  }, [usageType, isLoading]);

  if (checking || isLoading) return null;

  if (limitCheck && !limitCheck.allowed && !limitCheck.unlimited) {
    const labels: Record<string, { ar: string; en: string }> = {
      journal_entries: { ar: "قيود اليومية", en: "Journal Entries" },
      sales_invoices: { ar: "فواتير المبيعات", en: "Sales Invoices" },
      purchase_invoices: { ar: "فواتير المشتريات", en: "Purchase Invoices" },
    };
    const label = labels[usageType] || { ar: usageType, en: usageType };

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-base font-semibold">
          {isRTL ? "تم بلوغ الحد الأقصى" : "Monthly Limit Reached"}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            {isRTL
              ? `لقد وصلت إلى الحد الأقصى الشهري لـ${label.ar} (${limitCheck.current}/${limitCheck.limit}). يرجى ترقية خطتك للاستمرار.`
              : `You have reached your monthly limit for ${label.en} (${limitCheck.current}/${limitCheck.limit}). Please upgrade your plan to continue.`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/client/settings")}
          >
            <TrendingUp className="h-4 w-4" />
            {isRTL ? "ترقية الخطة" : "Upgrade Plan"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

export default UsageLimitGuard;
