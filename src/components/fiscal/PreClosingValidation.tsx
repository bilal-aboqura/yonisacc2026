import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Play, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  count: number;
}

const checkLabels: Record<string, [string, string]> = {
  draft_journal_entries: ["قيود يومية مسودة", "Draft Journal Entries"],
  unbalanced_entries: ["قيود غير متوازنة", "Unbalanced Entries"],
  draft_sales_invoices: ["فواتير مبيعات مسودة", "Draft Sales Invoices"],
  draft_purchase_invoices: ["فواتير مشتريات مسودة", "Draft Purchase Invoices"],
  pending_stock_movements: ["حركات مخزون معلقة", "Pending Stock Movements"],
  open_hr_periods: ["فترات رواتب مفتوحة", "Open HR Periods"],
  fiscal_year: ["السنة المالية", "Fiscal Year"],
};

interface Props {
  fiscalYearId: string | null;
  onValidationComplete?: (allPassed: boolean) => void;
}

const PreClosingValidation = ({ fiscalYearId, onValidationComplete }: Props) => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    if (!companyId || !fiscalYearId) {
      toast.error(isRTL ? "يرجى اختيار سنة مالية" : "Please select a fiscal year");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("pre_closing_validation", {
        p_company_id: companyId,
        p_fiscal_year_id: fiscalYearId,
      });
      if (error) throw error;
      const parsed: ValidationResult[] = Array.isArray(data) ? data : JSON.parse(data);
      setResults(parsed);
      const allPassed = parsed.every((r) => r.passed);
      onValidationComplete?.(allPassed);
      if (allPassed) {
        toast.success(isRTL ? "جميع الفحوصات ناجحة ✅" : "All checks passed ✅");
      } else {
        toast.warning(isRTL ? "توجد مشاكل يجب حلها قبل الإقفال" : "Issues found that must be resolved before closing");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const allPassed = results.length > 0 && results.every((r) => r.passed);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {isRTL ? "التحقق قبل الإقفال" : "Pre-Closing Validation"}
          </CardTitle>
          <Button onClick={runValidation} disabled={loading || !fiscalYearId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Play className="h-4 w-4 me-2" />}
            {isRTL ? "تشغيل الفحص" : "Run Checks"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? "اضغط على تشغيل الفحص للبدء" : "Click Run Checks to start validation"}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${r.passed ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-destructive/30 bg-destructive/5"}`}>
                <div className="flex items-center gap-3">
                  {r.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {isRTL ? (checkLabels[r.check]?.[0] || r.check) : (checkLabels[r.check]?.[1] || r.check)}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.message}</p>
                  </div>
                </div>
                <Badge variant={r.passed ? "default" : "destructive"}>
                  {r.passed ? (isRTL ? "ناجح" : "Passed") : `${r.count}`}
                </Badge>
              </div>
            ))}
            <div className={`mt-4 p-3 rounded-lg text-center font-medium ${allPassed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>
              {allPassed
                ? (isRTL ? "✅ جاهز للإقفال" : "✅ Ready to close")
                : (isRTL ? "❌ يجب حل المشاكل أعلاه قبل الإقفال" : "❌ Resolve the issues above before closing")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreClosingValidation;
