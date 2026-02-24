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
import { Plus, Search, FileText, Eye, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const PurchaseOrders = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, contacts(name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "purchase_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const filtered = orders.filter((o) =>
    o.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.contacts?.name && o.contacts.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statusBadge = (status: string | null) => {
    const map: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", labelAr: "مسودة", variant: "secondary" },
      confirmed: { label: "Confirmed", labelAr: "مؤكد", variant: "default" },
      received: { label: "Received", labelAr: "مستلم", variant: "default" },
      cancelled: { label: "Cancelled", labelAr: "ملغي", variant: "destructive" },
      converted: { label: "Converted", labelAr: "محوّل", variant: "outline" },
    };
    const s = map[status || "draft"] || map.draft;
    return <Badge variant={s.variant}>{isRTL ? s.labelAr : s.label}</Badge>;
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "أوامر الشراء" : "Purchase Orders"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة أوامر الشراء من الموردين" : "Manage purchase orders from vendors"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/purchase-orders/new")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "أمر شراء جديد" : "New Purchase Order"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? "قائمة أوامر الشراء" : "Purchase Orders List"}
            <Badge variant="secondary" className="ms-2">{filtered.length}</Badge>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث برقم الأمر أو اسم المورد..." : "Search by order number or vendor..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد أوامر شراء بعد" : "No purchase orders yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإنشاء أول أمر شراء" : "Start by creating your first purchase order"}
              </p>
              <Button className="gap-2" onClick={() => navigate("/client/purchase-orders/new")}>
                <Plus className="h-4 w-4" />
                {isRTL ? "إنشاء أمر شراء" : "Create Purchase Order"}
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "رقم الأمر" : "Order #"}</TableHead>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
                    <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.invoice_number}</TableCell>
                      <TableCell>{order.invoice_date}</TableCell>
                      <TableCell>
                        {order.contacts
                          ? (isRTL ? order.contacts.name : (order.contacts.name_en || order.contacts.name))
                          : "-"}
                      </TableCell>
                      <TableCell>{(order.total ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{statusBadge(order.status)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/invoices/${order.id}`)}>
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

export default PurchaseOrders;
