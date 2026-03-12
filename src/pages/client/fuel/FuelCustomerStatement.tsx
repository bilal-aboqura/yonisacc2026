import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Wallet, Fuel } from "lucide-react";
import { format } from "date-fns";

const FuelCustomerStatement = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customer } = useQuery({
    queryKey: ["fuel-customer", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_customers").select("*, fuel_wallets(*)").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const walletId = customer?.fuel_wallets?.[0]?.id;

  const { data: transactions } = useQuery({
    queryKey: ["fuel-wallet-txns", walletId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_wallet_transactions").select("*").eq("wallet_id", walletId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!walletId,
  });

  const { data: sales } = useQuery({
    queryKey: ["fuel-customer-sales", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_sales").select("*").eq("customer_id", id).order("sale_date", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  const typeLabels: Record<string, { ar: string; en: string }> = {
    recharge: { ar: "شحن", en: "Recharge" },
    deduction: { ar: "خصم", en: "Deduction" },
    refund: { ar: "استرداد", en: "Refund" },
  };

  const fuelLabels: Record<string, { ar: string; en: string }> = {
    gasoline_91: { ar: "بنزين 91", en: "Gasoline 91" },
    gasoline_95: { ar: "بنزين 95", en: "Gasoline 95" },
    diesel: { ar: "ديزل", en: "Diesel" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/fuel/customers")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "كشف حساب العميل" : "Customer Statement"}</h1>
          <p className="text-sm text-muted-foreground">{customer?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Wallet className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">{isRTL ? "رصيد المحفظة" : "Wallet Balance"}</p>
            <p className="text-2xl font-bold">{Number(customer?.fuel_wallets?.[0]?.balance || 0).toLocaleString()} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Fuel className="h-6 w-6 mx-auto text-amber-600 mb-2" />
            <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المشتريات" : "Total Purchases"}</p>
            <p className="text-2xl font-bold">{sales?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">{isRTL ? "حد الائتمان" : "Credit Limit"}</p>
            <p className="text-2xl font-bold">{Number(customer?.credit_limit || 0).toLocaleString()} SAR</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "حركات المحفظة" : "Wallet Transactions"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                <TableHead>{isRTL ? "الرصيد بعد" : "Balance After"}</TableHead>
                <TableHead>{isRTL ? "ملاحظات" : "Notes"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(transactions || []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell>
                    <Badge variant={t.type === "recharge" ? "default" : t.type === "refund" ? "secondary" : "outline"}>
                      {isRTL ? typeLabels[t.type]?.ar : typeLabels[t.type]?.en}
                    </Badge>
                  </TableCell>
                  <TableCell className={t.type === "deduction" ? "text-destructive" : "text-emerald-600"}>
                    {t.type === "deduction" ? "-" : "+"}{Number(t.amount).toLocaleString()} SAR
                  </TableCell>
                  <TableCell>{Number(t.balance_after).toLocaleString()} SAR</TableCell>
                  <TableCell>{t.notes || "—"}</TableCell>
                </TableRow>
              ))}
              {(!transactions || transactions.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد حركات" : "No transactions"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "آخر المشتريات" : "Recent Purchases"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "نوع الوقود" : "Fuel Type"}</TableHead>
                <TableHead>{isRTL ? "الكمية (لتر)" : "Qty (L)"}</TableHead>
                <TableHead>{isRTL ? "السعر" : "Price"}</TableHead>
                <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sales || []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{format(new Date(s.sale_date), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell>{isRTL ? fuelLabels[s.fuel_type]?.ar : fuelLabels[s.fuel_type]?.en}</TableCell>
                  <TableCell>{Number(s.quantity).toLocaleString()}</TableCell>
                  <TableCell>{Number(s.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">{Number(s.total_amount).toLocaleString()} SAR</TableCell>
                </TableRow>
              ))}
              {(!sales || sales.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد مشتريات" : "No purchases"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FuelCustomerStatement;
