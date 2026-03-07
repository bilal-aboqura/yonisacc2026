import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, Eye, Pencil, Loader2, Package, Truck, CheckCircle, XCircle } from "lucide-react";

const DeliveryOrders = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["delivery-orders", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("delivery_orders")
        .select("*, delivery_drivers(name, name_en), delivery_areas(name, name_en)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      pending: ["معلق", "Pending"],
      preparing: ["قيد التحضير", "Preparing"],
      out_for_delivery: ["قيد التوصيل", "Out for Delivery"],
      delivered: ["تم التوصيل", "Delivered"],
      cancelled: ["ملغي", "Cancelled"],
      returned: ["مرتجع", "Returned"],
    };
    return isRTL ? map[s]?.[0] || s : map[s]?.[1] || s;
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "preparing": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "out_for_delivery": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "delivered": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "returned": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default: return "";
    }
  };

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.customer_phone?.includes(search);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalOrders = filtered.length;
  const totalAmount = filtered.reduce((s: number, o: any) => s + (Number(o.order_total) || 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">{isRTL ? "طلبات التوصيل" : "Delivery Orders"}</h1>
        <Button onClick={() => navigate("/client/delivery/orders/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "طلب جديد" : "New Order"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold tabular-nums">{totalOrders}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الطلبات" : "Total Orders"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Truck className="h-5 w-5 mx-auto mb-1 text-orange-500" />
          <p className="text-xl font-bold tabular-nums">{filtered.filter((o: any) => o.status === "out_for_delivery").length}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? "قيد التوصيل" : "In Delivery"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <p className="text-xl font-bold tabular-nums">{filtered.filter((o: any) => o.status === "delivered").length}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? "تم التوصيل" : "Delivered"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <p className="text-xl font-bold tabular-nums">{totalAmount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي المبلغ" : "Total Amount"}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="ps-9" placeholder={isRTL ? "بحث بالرقم أو الاسم أو الهاتف..." : "Search by number, name, phone..."} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Status"}</SelectItem>
                <SelectItem value="pending">{isRTL ? "معلق" : "Pending"}</SelectItem>
                <SelectItem value="preparing">{isRTL ? "قيد التحضير" : "Preparing"}</SelectItem>
                <SelectItem value="out_for_delivery">{isRTL ? "قيد التوصيل" : "Out for Delivery"}</SelectItem>
                <SelectItem value="delivered">{isRTL ? "تم التوصيل" : "Delivered"}</SelectItem>
                <SelectItem value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</SelectItem>
                <SelectItem value="returned">{isRTL ? "مرتجع" : "Returned"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "رقم الطلب" : "Order #"}</TableHead>
                <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                <TableHead className="hidden md:table-cell">{isRTL ? "الهاتف" : "Phone"}</TableHead>
                <TableHead className="hidden md:table-cell">{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead className="hidden lg:table-cell">{isRTL ? "السائق" : "Driver"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-end">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o: any, i: number) => (
                <TableRow key={o.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <TableCell className="font-medium tabular-nums">{o.order_number}</TableCell>
                  <TableCell>{o.customer_name}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{o.customer_phone || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{o.order_date}</TableCell>
                  <TableCell className="hidden lg:table-cell">{isRTL ? o.delivery_drivers?.name : (o.delivery_drivers?.name_en || o.delivery_drivers?.name) || "-"}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(o.status)}>{statusLabel(o.status)}</Badge></TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">{Number(o.order_total).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/delivery/orders/${o.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger><TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/delivery/orders/${o.id}/edit`)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger><TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent></Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد طلبات" : "No orders found"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryOrders;
