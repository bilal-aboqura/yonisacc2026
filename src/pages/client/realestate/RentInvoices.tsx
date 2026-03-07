import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Receipt, DollarSign, ArrowLeft, ArrowRight } from "lucide-react";

const RentInvoices = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["re-rent-invoices", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("re_rent_invoices")
        .select("*, re_tenants(name, name_en), re_units(unit_number)")
        .eq("company_id", companyId!)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const statusBadge = (s: string) => {
    const map: Record<string, { l: string; a: string; v: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { l: "Paid", a: "مدفوعة", v: "default" },
      partial: { l: "Partial", a: "جزئي", v: "outline" },
      unpaid: { l: "Unpaid", a: "غير مدفوعة", v: "destructive" },
      overdue: { l: "Overdue", a: "متأخرة", v: "destructive" },
    };
    const m = map[s] || { l: s, a: s, v: "outline" as const };
    return <Badge variant={m.v}>{isRTL ? m.a : m.l}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client")}>
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              {isRTL ? "فواتير الإيجار" : "Rent Invoices"}
            </h1>
          </div>
        </div>
        <Button onClick={() => navigate("/client/realestate/invoices/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إصدار فاتورة" : "Create Invoice"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                <TableHead>{isRTL ? "المستأجر" : "Tenant"}</TableHead>
                <TableHead>{isRTL ? "الوحدة" : "Unit"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
                <TableHead className="text-end tabular-nums">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                <TableHead className="text-end tabular-nums">{isRTL ? "المدفوع" : "Paid"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد فواتير" : "No invoices"}</TableCell></TableRow>
              ) : (
                invoices.map((inv: any, idx: number) => (
                  <TableRow key={inv.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium tabular-nums">{inv.invoice_number}</TableCell>
                    <TableCell>{isRTL ? inv.re_tenants?.name : (inv.re_tenants?.name_en || inv.re_tenants?.name)}</TableCell>
                    <TableCell>{inv.re_units?.unit_number}</TableCell>
                    <TableCell className="tabular-nums">{inv.invoice_date}</TableCell>
                    <TableCell className="tabular-nums">{inv.period_from} → {inv.period_to}</TableCell>
                    <TableCell className="text-end tabular-nums">{Number(inv.total_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-end tabular-nums">{Number(inv.paid_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{statusBadge(inv.payment_status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/client/realestate/invoices/${inv.id}/pay`)}>
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </TableCell>
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

export default RentInvoices;
