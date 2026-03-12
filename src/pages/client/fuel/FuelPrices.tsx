import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";

const fuelTypes = [
  { key: "gasoline_91", ar: "بنزين 91", en: "Gasoline 91", defaultPrice: 2.18 },
  { key: "gasoline_95", ar: "بنزين 95", en: "Gasoline 95", defaultPrice: 2.33 },
  { key: "diesel", ar: "ديزل", en: "Diesel", defaultPrice: 1.15 },
];

const FuelPrices = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [newPrices, setNewPrices] = useState<Record<string, string>>({});

  const { data: priceHistory } = useQuery({
    queryKey: ["fuel-prices-history", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_prices").select("*").eq("company_id", companyId).order("effective_date", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Get current prices (latest per type)
  const currentPrices: Record<string, number> = {};
  (priceHistory || []).forEach((p: any) => {
    if (!currentPrices[p.fuel_type]) currentPrices[p.fuel_type] = p.price_per_liter;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const inserts = Object.entries(newPrices)
        .filter(([_, v]) => v && parseFloat(v) > 0)
        .map(([fuelType, price]) => ({
          company_id: companyId, fuel_type: fuelType,
          price_per_liter: parseFloat(price), effective_date: new Date().toISOString().split("T")[0],
        }));
      if (inserts.length === 0) throw new Error(isRTL ? "أدخل سعراً واحداً على الأقل" : "Enter at least one price");
      const { error } = await (supabase as any).from("fuel_prices").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-prices"] });
      setNewPrices({});
      toast({ title: isRTL ? "تم تحديث الأسعار" : "Prices Updated" });
    },
    onError: (e: any) => toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <DollarSign className="h-6 w-6" />
        {isRTL ? "إدارة أسعار الوقود" : "Fuel Price Management"}
      </h1>

      {/* Current Prices & Update */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "الأسعار الحالية" : "Current Prices"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {fuelTypes.map(ft => (
              <Card key={ft.key} className="bg-muted/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{isRTL ? ft.ar : ft.en}</Badge>
                    <span className="text-xl font-bold">{(currentPrices[ft.key] || ft.defaultPrice).toFixed(2)} SAR</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isRTL ? "سعر جديد" : "New Price"}</Label>
                    <Input
                      type="number" dir="ltr" step="0.01" placeholder={(currentPrices[ft.key] || ft.defaultPrice).toFixed(2)}
                      value={newPrices[ft.key] || ""}
                      onChange={e => setNewPrices(p => ({ ...p, [ft.key]: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={Object.keys(newPrices).length === 0 || saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isRTL ? "تحديث الأسعار" : "Update Prices"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader><CardTitle>{isRTL ? "سجل الأسعار" : "Price History"}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "نوع الوقود" : "Fuel Type"}</TableHead>
                <TableHead>{isRTL ? "السعر" : "Price"}</TableHead>
                <TableHead>{isRTL ? "تاريخ السريان" : "Effective Date"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(priceHistory || []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell><Badge variant="outline">{isRTL ? fuelTypes.find(f => f.key === p.fuel_type)?.ar : fuelTypes.find(f => f.key === p.fuel_type)?.en}</Badge></TableCell>
                  <TableCell className="font-semibold">{Number(p.price_per_liter).toFixed(2)} SAR</TableCell>
                  <TableCell>{format(new Date(p.effective_date), "yyyy-MM-dd")}</TableCell>
                </TableRow>
              ))}
              {(!priceHistory || priceHistory.length === 0) && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد أسعار مسجلة" : "No prices recorded"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FuelPrices;
