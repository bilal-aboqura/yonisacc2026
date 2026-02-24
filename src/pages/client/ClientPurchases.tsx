import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart, Eye, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const ClientPurchases = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["purchase-invoices", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, contacts(name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "purchase")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const filtered = invoices.filter((inv) =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.contacts?.name && inv.contacts.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paymentBadge = (status: string | null) => {
    const map: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: "Paid", labelAr: "مدفوعة", variant: "default" },
      unpaid: { label: "Unpaid", labelAr: "غير مدفوعة", variant: "destructive" },
      partial: { label: "Partial", labelAr: "جزئية", variant: "outline" },
    };
    const s = map[status || "unpaid"] || map.unpaid;
    return <Badge variant={s.variant}>{isRTL ? s.labelAr : s.label}</Badge>;
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "فواتير المشتريات" : "Purchase Invoices"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة فواتير المشتريات والموردين" : "Manage purchase invoices and vendors"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/purchases/new")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "فاتورة جديدة" : "New Invoice"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث برقم الفاتورة أو اسم المورد..." : "Search by invoice number or vendor..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {isRTL ? "قائمة الفواتير" : "Invoices List"}
            <Badge variant="secondary" className="ms-2">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد فواتير بعد" : "No invoices yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإنشاء أول فاتورة مشتريات" : "Start by creating your first purchase invoice"}
              </p>
              <Button className="gap-2" onClick={() => navigate("/client/purchases/new")}>
                <Plus className="h-4 w-4" />
                {isRTL ? "إنشاء فاتورة" : "Create Invoice"}
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
                    <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead>{isRTL ? "المدفوع" : "Paid"}</TableHead>
                    <TableHead>{isRTL ? "حالة الدفع" : "Payment"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.invoice_date}</TableCell>
                      <TableCell>
                        {inv.contacts
                          ? (isRTL ? inv.contacts.name : (inv.contacts.name_en || inv.contacts.name))
                          : "-"}
                      </TableCell>
                      <TableCell>{(inv.total ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{(inv.paid_amount ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{paymentBadge(inv.payment_status)}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "posted" ? "default" : "secondary"}>
                          {inv.status === "posted" ? (isRTL ? "معتمدة" : "Posted") : (isRTL ? "مسودة" : "Draft")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/invoices/${inv.id}`)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientPurchases;
