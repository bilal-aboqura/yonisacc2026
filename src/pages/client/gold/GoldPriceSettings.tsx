import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

const KARATS = ["24k", "22k", "21k", "18k"] as const;
const KARAT_RATIOS: Record<string, number> = { "24k": 1, "22k": 22 / 24, "21k": 21 / 24, "18k": 18 / 24 };

const GoldPriceSettings = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();

  const [priceDate, setPriceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [prices, setPrices] = useState<Record<string, string>>({ "24k": "", "22k": "", "21k": "", "18k": "" });
  const [autoCalc, setAutoCalc] = useState(true);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["gold-prices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("gold_price_settings" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("price_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const entries = KARATS.filter(k => prices[k] && parseFloat(prices[k]) > 0).map(k => ({
        company_id: companyId,
        price_date: priceDate,
        karat: k,
        price_per_gram: parseFloat(prices[k]),
        updated_at: new Date().toISOString(),
      }));
      if (entries.length === 0) throw new Error("Enter at least one price");

      for (const entry of entries) {
        const { error } = await supabase
          .from("gold_price_settings" as any)
          .upsert(entry, { onConflict: "company_id,price_date,karat" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ الأسعار بنجاح" : "Prices saved successfully");
      queryClient.invalidateQueries({ queryKey: ["gold-prices"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePrice24kChange = (val: string) => {
    const newPrices = { ...prices, "24k": val };
    if (autoCalc && val) {
      const base = parseFloat(val);
      if (!isNaN(base)) {
        newPrices["22k"] = (base * KARAT_RATIOS["22k"]).toFixed(2);
        newPrices["21k"] = (base * KARAT_RATIOS["21k"]).toFixed(2);
        newPrices["18k"] = (base * KARAT_RATIOS["18k"]).toFixed(2);
      }
    }
    setPrices(newPrices);
  };

  // Group history by date
  const groupedHistory = (history as any[]).reduce((acc: any, item: any) => {
    if (!acc[item.price_date]) acc[item.price_date] = {};
    acc[item.price_date][item.karat] = item.price_per_gram;
    return acc;
  }, {});

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "أسعار الذهب اليومية" : "Daily Gold Prices"}</h1>
          <p className="text-muted-foreground">{isRTL ? "تحديث أسعار الذهب لكل عيار" : "Update gold prices per karat"}</p>
        </div>
      </div>

      {/* Price Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            {isRTL ? "تحديث الأسعار" : "Update Prices"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "التاريخ" : "Date"}</label>
              <Input type="date" value={priceDate} onChange={(e) => setPriceDate(e.target.value)} className="w-44" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={autoCalc} onChange={(e) => setAutoCalc(e.target.checked)} id="autoCalc" />
              <label htmlFor="autoCalc" className="text-sm">{isRTL ? "حساب تلقائي من عيار 24" : "Auto-calculate from 24k"}</label>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KARATS.map(k => (
              <div key={k} className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400" />
                  {isRTL ? `عيار ${k.replace("k", "")}` : `${k} Karat`}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={isRTL ? "سعر الجرام" : "Price/gram"}
                  value={prices[k]}
                  onChange={(e) => k === "24k" ? handlePrice24kChange(e.target.value) : setPrices(p => ({ ...p, [k]: e.target.value }))}
                  disabled={autoCalc && k !== "24k"}
                />
              </div>
            ))}
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
            <Save className="h-4 w-4 me-2" />
            {saveMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ الأسعار" : "Save Prices")}
          </Button>
        </CardContent>
      </Card>

      {/* Price History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isRTL ? "سجل الأسعار" : "Price History"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  {KARATS.map(k => (
                    <TableHead key={k} className="text-center">{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedHistory).map(([date, karatPrices]: [string, any]) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">{date}</TableCell>
                    {KARATS.map(k => (
                      <TableCell key={k} className="text-center">
                        {karatPrices[k] ? Number(karatPrices[k]).toFixed(2) : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {Object.keys(groupedHistory).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {isRTL ? "لا توجد أسعار مسجلة بعد" : "No prices recorded yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoldPriceSettings;
