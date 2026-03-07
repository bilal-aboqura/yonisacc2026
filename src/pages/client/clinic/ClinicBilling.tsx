import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Receipt, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ClinicBilling = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["clinic-invoices", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("clinic_invoices")
        .select("*, patients(name, name_en, patient_number), doctors(name, name_en)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const statusBadge = (s: string) => {
    const map: Record<string, [string, string, any]> = {
      unpaid: ["غير مدفوعة", "Unpaid", "destructive"],
      partial: ["مدفوعة جزئياً", "Partial", "outline"],
      paid: ["مدفوعة", "Paid", "default"],
    };
    const [ar, en, variant] = map[s] || [s, s, "secondary"];
    return <Badge variant={variant}>{isRTL ? ar : en}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" />{isRTL ? "الفوترة" : "Billing"}</h1>
        <Button onClick={() => navigate("/client/clinic/billing/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "فاتورة جديدة" : "New Invoice"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "المريض" : "Patient"}</TableHead>
                  <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                  <TableHead>{isRTL ? "المدفوع" : "Paid"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد فواتير" : "No invoices"}</TableCell></TableRow>
                ) : invoices.map((inv: any, idx: number) => (
                  <TableRow key={inv.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="font-mono tabular-nums">{inv.invoice_number}</TableCell>
                    <TableCell className="tabular-nums">{inv.invoice_date}</TableCell>
                    <TableCell>{inv.patients?.patient_number} - {isRTL ? inv.patients?.name : inv.patients?.name_en || inv.patients?.name}</TableCell>
                    <TableCell className="font-mono tabular-nums">{parseFloat(inv.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="font-mono tabular-nums">{parseFloat(inv.paid_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>{statusBadge(inv.payment_status)}</TableCell>
                    <TableCell>
                      {inv.payment_status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/client/clinic/billing/${inv.id}/pay`)}>
                          <DollarSign className="h-3 w-3 me-1" />{isRTL ? "دفع" : "Pay"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClinicBilling;
