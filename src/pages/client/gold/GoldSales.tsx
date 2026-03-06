import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Receipt, Weight, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const GoldSales = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["gold-sales", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("gold_sales_invoices" as any)
        .select("*, contacts:contact_id(name, name_en)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const confirmMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await (supabase as any).rpc("confirm_gold_sale", { p_invoice_id: invoiceId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم تأكيد الفاتورة وإنشاء القيد" : "Invoice confirmed and journal entry created");
      queryClient.invalidateQueries({ queryKey: ["gold-sales"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (invoices as any[]).filter((inv: any) =>
    !search || inv.invoice_number?.includes(search) || inv.contacts?.name?.includes(search)
  );

  const totalAmount = filtered.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const totalWeight = filtered.reduce((s: number, i: any) => s + (i.total_weight || 0), 0);

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "فواتير بيع الذهب" : "Gold Sales Invoices"}</h1>
          <p className="text-muted-foreground">{isRTL ? "إدارة مبيعات الذهب" : "Manage gold sales"}</p>
        </div>
        <Button onClick={() => navigate("/client/gold/sales/new")} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "فاتورة جديدة" : "New Invoice"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><Receipt className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">{isRTL ? "عدد الفواتير" : "Invoices"}</p><p className="text-xl font-bold">{filtered.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Weight className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الوزن" : "Total Weight"}</p><p className="text-xl font-bold">{totalWeight.toFixed(2)} g</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><DollarSign className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المبلغ" : "Total Amount"}</p><p className="text-xl font-bold">{totalAmount.toFixed(2)}</p></div>
        </CardContent></Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
              <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
              <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
              <TableHead>{isRTL ? "الوزن" : "Weight"}</TableHead>
              <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد فواتير" : "No invoices"}</TableCell></TableRow>
            ) : filtered.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                <TableCell>{inv.invoice_date}</TableCell>
                <TableCell>{isRTL ? inv.contacts?.name : (inv.contacts?.name_en || inv.contacts?.name)}</TableCell>
                <TableCell>{Number(inv.total_weight).toFixed(2)} g</TableCell>
                <TableCell className="font-semibold">{Number(inv.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={inv.status === "confirmed" ? "default" : "secondary"}>
                    {inv.status === "confirmed" ? (isRTL ? "مؤكدة" : "Confirmed") : (isRTL ? "مسودة" : "Draft")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {inv.status === "draft" && (
                    <Button variant="ghost" size="sm" onClick={() => confirmMutation.mutate(inv.id)} disabled={confirmMutation.isPending}>
                      <CheckCircle className="h-4 w-4 me-1" />
                      {isRTL ? "تأكيد" : "Confirm"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default GoldSales;
