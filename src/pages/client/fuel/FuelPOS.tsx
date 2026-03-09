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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Fuel, Loader2, ShoppingCart, Wallet, Banknote, Check, User } from "lucide-react";

const fuelLabels: Record<string, { ar: string; en: string }> = {
  gasoline_91: { ar: "بنزين 91", en: "Gasoline 91" },
  gasoline_95: { ar: "بنزين 95", en: "Gasoline 95" },
  diesel: { ar: "ديزل", en: "Diesel" },
};

const FuelPOS = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState("");
  const [pumpId, setPumpId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cash">("cash");
  const [saleComplete, setSaleComplete] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ["fuel-customers-active", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_customers").select("id, name, name_en, plate_number, fuel_wallets(id, balance)").eq("company_id", companyId).eq("status", "active").order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: pumps } = useQuery({
    queryKey: ["fuel-pumps-active", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_pumps").select("id, pump_number, fuel_type, tank_id").eq("company_id", companyId).eq("status", "active").order("pump_number");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: prices } = useQuery({
    queryKey: ["fuel-prices-latest", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_prices").select("*").eq("company_id", companyId).order("effective_date", { ascending: false });
      const latest: Record<string, number> = {};
      (data || []).forEach((p: any) => { if (!latest[p.fuel_type]) latest[p.fuel_type] = p.price_per_liter; });
      return latest;
    },
    enabled: !!companyId,
  });

  const selectedPump = pumps?.find((p: any) => p.id === pumpId);
  const fuelType = selectedPump?.fuel_type || "";
  const unitPrice = prices?.[fuelType] || 0;
  const qty = parseFloat(quantity) || 0;
  const totalAmount = qty * unitPrice;

  const selectedCustomer = customers?.find((c: any) => c.id === customerId);
  const walletBalance = selectedCustomer?.fuel_wallets?.[0]?.balance || 0;
  const walletId = selectedCustomer?.fuel_wallets?.[0]?.id;

  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!pumpId || qty <= 0) throw new Error(isRTL ? "اختر المضخة وأدخل الكمية" : "Select pump and enter quantity");
      if (paymentMethod === "wallet" && !customerId) throw new Error(isRTL ? "اختر العميل للدفع من المحفظة" : "Select customer for wallet payment");
      if (paymentMethod === "wallet" && walletBalance < totalAmount) throw new Error(isRTL ? "رصيد المحفظة غير كافٍ" : "Insufficient wallet balance");

      const { data: settings } = await (supabase as any).from("fuel_station_account_settings").select("*").eq("company_id", companyId).maybeSingle();

      let journalEntryId = null;
      const debitAccount = paymentMethod === "wallet" ? settings?.fuel_wallet_liability_account_id : settings?.fuel_cash_account_id;
      const creditAccount = settings?.fuel_sales_revenue_account_id;

      if (debitAccount && creditAccount && totalAmount > 0) {
        const entryNumber = `FS-${Date.now()}`;
        const { data: je, error: jeErr } = await (supabase as any).from("journal_entries").insert({
          company_id: companyId!,
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split("T")[0],
          description: `${isRTL ? "بيع وقود" : "Fuel sale"} - ${fuelLabels[fuelType]?.[isRTL ? "ar" : "en"]} - ${qty}L`,
          status: "posted",
          is_auto: true,
        }).select("id").single();
        if (jeErr) throw jeErr;
        journalEntryId = je.id;

        await (supabase as any).from("journal_entry_lines").insert([
          { entry_id: je.id, account_id: debitAccount, debit: totalAmount, credit: 0 },
          { entry_id: je.id, account_id: creditAccount, debit: 0, credit: totalAmount },
        ]);
      }

      await (supabase as any).from("fuel_sales").insert({
        company_id: companyId, customer_id: customerId || null, pump_id: pumpId,
        fuel_type: fuelType, quantity: qty, unit_price: unitPrice,
        total_amount: totalAmount, payment_method: paymentMethod,
        journal_entry_id: journalEntryId,
      });

      if (selectedPump?.tank_id) {
        const { data: tank } = await (supabase as any).from("fuel_tanks").select("current_qty").eq("id", selectedPump.tank_id).single();
        if (tank) {
          await (supabase as any).from("fuel_tanks").update({ current_qty: Math.max(0, Number(tank.current_qty) - qty) }).eq("id", selectedPump.tank_id);
        }
      }

      if (paymentMethod === "wallet" && walletId) {
        const newBal = walletBalance - totalAmount;
        await (supabase as any).from("fuel_wallets").update({ balance: newBal }).eq("id", walletId);
        await (supabase as any).from("fuel_wallet_transactions").insert({
          company_id: companyId, wallet_id: walletId, type: "deduction",
          amount: totalAmount, balance_after: newBal, notes: `${fuelLabels[fuelType]?.[isRTL ? "ar" : "en"]} - ${qty}L`,
        });

        await (supabase as any).from("fuel_message_logs").insert({
          company_id: companyId, customer_id: customerId, event_type: "fuel_purchase",
          message_text: `${isRTL ? "تم شراء" : "Purchased"} ${qty} ${isRTL ? "لتر" : "liters"} ${fuelLabels[fuelType]?.[isRTL ? "ar" : "en"]}. ${isRTL ? "المبلغ:" : "Amount:"} ${totalAmount} SAR. ${isRTL ? "الرصيد المتبقي:" : "Remaining:"} ${newBal} SAR.`,
          status: "logged",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-"] });
      setSaleComplete(true);
      setTimeout(() => {
        setSaleComplete(false);
        setCustomerId(""); setPumpId(""); setQuantity("");
      }, 3000);
      toast({ title: isRTL ? "تمت عملية البيع" : "Sale Complete" });
    },
    onError: (e: any) => toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" }),
  });

  if (saleComplete) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-80 text-center">
          <CardContent className="pt-12 pb-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">{isRTL ? "تمت العملية بنجاح!" : "Sale Complete!"}</h2>
            <p className="text-muted-foreground">{totalAmount.toLocaleString()} SAR</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Fuel className="h-6 w-6" />
        {isRTL ? "نقطة بيع الوقود" : "Fuel POS"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label>{isRTL ? "العميل (اختياري للدفع النقدي)" : "Customer (optional for cash)"}</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر العميل" : "Select Customer"} /></SelectTrigger>
                  <SelectContent>
                    {(customers || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Info Card */}
              {selectedCustomer && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        {selectedCustomer.plate_number && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedCustomer.plate_number.split("،").map((p: string, i: number) => p.trim() && (
                              <Badge key={i} variant="secondary" className="text-xs">{p.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <Wallet className="h-4 w-4 text-blue-600" />
                          <span className={walletBalance > 0 ? "text-blue-600" : "text-destructive"}>
                            {Number(walletBalance).toLocaleString()} SAR
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{isRTL ? "رصيد المحفظة" : "Wallet Balance"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pump */}
              <div className="space-y-2">
                <Label>{isRTL ? "المضخة *" : "Pump *"}</Label>
                <Select value={pumpId} onValueChange={setPumpId}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر المضخة" : "Select Pump"} /></SelectTrigger>
                  <SelectContent>
                    {(pumps || []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {isRTL ? "مضخة" : "Pump"} {p.pump_number} — {fuelLabels[p.fuel_type]?.[isRTL ? "ar" : "en"]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fuelType && (
                <div className="flex items-center gap-2">
                  <Badge>{fuelLabels[fuelType]?.[isRTL ? "ar" : "en"]}</Badge>
                  <span className="text-sm text-muted-foreground">{unitPrice.toFixed(2)} SAR/{isRTL ? "لتر" : "L"}</span>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <Label>{isRTL ? "الكمية (لتر) *" : "Quantity (Liters) *"}</Label>
                <Input type="number" dir="ltr" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="text-2xl h-14" />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>{isRTL ? "طريقة الدفع" : "Payment Method"}</Label>
                <RadioGroup value={paymentMethod} onValueChange={v => setPaymentMethod(v as "wallet" | "cash")} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <label htmlFor="cash" className="flex items-center gap-1 cursor-pointer">
                      <Banknote className="h-4 w-4" />
                      {isRTL ? "نقدي" : "Cash"}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="wallet" id="wallet" disabled={!customerId} />
                    <label htmlFor="wallet" className={`flex items-center gap-1 cursor-pointer ${!customerId ? "opacity-50" : ""}`}>
                      <Wallet className="h-4 w-4" />
                      {isRTL ? "المحفظة" : "Wallet"}
                    </label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {isRTL ? "ملخص البيع" : "Sale Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fuelType && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? "نوع الوقود" : "Fuel Type"}</span>
                    <span>{fuelLabels[fuelType]?.[isRTL ? "ar" : "en"]}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? "الكمية" : "Quantity"}</span>
                    <span>{qty.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? "سعر اللتر" : "Price/L"}</span>
                    <span>{unitPrice.toFixed(2)} SAR</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>{isRTL ? "الإجمالي" : "Total"}</span>
                    <span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</span>
                  </div>
                </>
              )}

              <Button
                onClick={() => saleMutation.mutate()}
                disabled={!pumpId || qty <= 0 || saleMutation.isPending}
                className="w-full h-14 text-lg gap-2"
                size="lg"
              >
                {saleMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
                {isRTL ? "تأكيد البيع" : "Confirm Sale"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FuelPOS;
