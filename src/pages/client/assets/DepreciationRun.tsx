import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, Loader2, Play } from "lucide-react";

const DepreciationRun = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [periodDate, setPeriodDate] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const { data: assets } = useQuery({
    queryKey: ["depreciable-assets", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fixed_assets")
        .select("*, depreciation_entries:asset_depreciation_entries(depreciation_amount)")
        .eq("company_id", companyId)
        .eq("status", "active")
        .eq("is_active", true)
        .order("asset_code");
      return data || [];
    },
    enabled: !!companyId,
  });

  const calculateDepreciation = (asset: any) => {
    const cost = asset.purchase_cost || 0;
    const salvage = asset.salvage_value || 0;
    const months = asset.useful_life_months || 60;
    const totalDep = asset.depreciation_entries?.reduce((s: number, e: any) => s + (e.depreciation_amount || 0), 0) || 0;
    const depreciable = cost - salvage;
    const remaining = depreciable - totalDep;

    if (remaining <= 0) return { monthly: 0, accumulated: totalDep, bookValue: salvage, fullyDepreciated: true };

    let monthly = 0;
    if (asset.depreciation_method === "straight_line") {
      monthly = depreciable / months;
    } else if (asset.depreciation_method === "declining_balance") {
      const rate = 2 / months;
      const currentBookValue = cost - totalDep;
      monthly = currentBookValue * rate;
    } else {
      monthly = depreciable / months;
    }

    monthly = Math.min(monthly, remaining);
    return {
      monthly: Math.round(monthly * 100) / 100,
      accumulated: totalDep + monthly,
      bookValue: cost - totalDep - monthly,
      fullyDepreciated: false,
    };
  };

  const depreciableAssets = assets?.map((a: any) => ({
    ...a,
    calc: calculateDepreciation(a),
  })).filter((a: any) => !a.calc.fullyDepreciated) || [];

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedAssets.length === depreciableAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(depreciableAssets.map((a: any) => a.id));
    }
  };

  const runMutation = useMutation({
    mutationFn: async () => {
      const entries = depreciableAssets
        .filter((a: any) => selectedAssets.includes(a.id))
        .map((a: any) => ({
          company_id: companyId,
          asset_id: a.id,
          period_date: periodDate,
          depreciation_amount: a.calc.monthly,
          accumulated_amount: a.calc.accumulated,
          book_value: a.calc.bookValue,
          is_posted: false,
        }));

      if (entries.length === 0) throw new Error(isRTL ? "اختر أصول أولاً" : "Select assets first");

      const { error } = await (supabase as any).from("asset_depreciation_entries").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["depreciable-assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-depreciation"] });
      setSelectedAssets([]);
      toast({ title: isRTL ? "تم تسجيل الإهلاك بنجاح" : "Depreciation entries created" });
    },
    onError: (err: Error) => toast({ title: isRTL ? "خطأ" : "Error", description: err.message, variant: "destructive" }),
  });

  const totalMonthly = depreciableAssets
    .filter((a: any) => selectedAssets.includes(a.id))
    .reduce((s: number, a: any) => s + a.calc.monthly, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calculator className="h-6 w-6" />
        {isRTL ? "تشغيل الإهلاك" : "Run Depreciation"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "فترة الإهلاك" : "Depreciation Period"}</CardTitle>
          <CardDescription>
            {isRTL ? "اختر تاريخ الفترة وحدد الأصول المراد حساب إهلاكها" : "Select the period date and choose which assets to depreciate"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "تاريخ الفترة" : "Period Date"}</Label>
              <Input type="date" value={periodDate} onChange={e => setPeriodDate(e.target.value)} dir="ltr" className="w-48" />
            </div>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={selectedAssets.length === 0 || runMutation.isPending}
              className="gap-2"
            >
              {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRTL ? `تسجيل الإهلاك (${selectedAssets.length})` : `Run Depreciation (${selectedAssets.length})`}
            </Button>
            {selectedAssets.length > 0 && (
              <Badge variant="outline" className="text-base px-3 py-1">
                {isRTL ? "الإجمالي:" : "Total:"} {totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Badge>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedAssets.length === depreciableAssets.length && depreciableAssets.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>{isRTL ? "الكود" : "Code"}</TableHead>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "التكلفة" : "Cost"}</TableHead>
                <TableHead>{isRTL ? "الإهلاك الشهري" : "Monthly Dep."}</TableHead>
                <TableHead>{isRTL ? "المتراكم بعد" : "Acc. After"}</TableHead>
                <TableHead>{isRTL ? "القيمة الدفترية بعد" : "Book Value After"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depreciableAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد أصول قابلة للإهلاك" : "No depreciable assets"}
                  </TableCell>
                </TableRow>
              ) : (
                depreciableAssets.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Checkbox checked={selectedAssets.includes(a.id)} onCheckedChange={() => toggleAsset(a.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a.asset_code}</TableCell>
                    <TableCell className="font-medium">{isRTL ? a.name : (a.name_en || a.name)}</TableCell>
                    <TableCell>{a.purchase_cost?.toLocaleString()}</TableCell>
                    <TableCell className="text-amber-600 font-semibold">{a.calc.monthly.toLocaleString()}</TableCell>
                    <TableCell>{a.calc.accumulated.toLocaleString()}</TableCell>
                    <TableCell>{a.calc.bookValue.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepreciationRun;
