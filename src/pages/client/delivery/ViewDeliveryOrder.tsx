import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Pencil, Loader2, Truck, User, MapPin, Phone, Calendar } from "lucide-react";

const ViewDeliveryOrder = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["delivery-order", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("delivery_orders")
        .select("*, delivery_drivers(name, name_en), delivery_areas(name, name_en)")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const payload: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "delivered") payload.delivered_at = new Date().toISOString();
      const { error } = await (supabase as any).from("delivery_orders").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم تحديث الحالة" : "Status updated");
      queryClient.invalidateQueries({ queryKey: ["delivery-order", id] });
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

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

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      pending: ["معلق", "Pending"], preparing: ["قيد التحضير", "Preparing"],
      out_for_delivery: ["قيد التوصيل", "Out for Delivery"], delivered: ["تم التوصيل", "Delivered"],
      cancelled: ["ملغي", "Cancelled"], returned: ["مرتجع", "Returned"],
    };
    return isRTL ? map[s]?.[0] || s : map[s]?.[1] || s;
  };

  if (isLoading || !order) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/delivery/orders")}><BackIcon className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{order.order_number}</h1>
            <Badge variant="outline" className={statusColor(order.status)}>{statusLabel(order.status)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={order.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{isRTL ? "معلق" : "Pending"}</SelectItem>
              <SelectItem value="preparing">{isRTL ? "قيد التحضير" : "Preparing"}</SelectItem>
              <SelectItem value="out_for_delivery">{isRTL ? "قيد التوصيل" : "Out for Delivery"}</SelectItem>
              <SelectItem value="delivered">{isRTL ? "تم التوصيل" : "Delivered"}</SelectItem>
              <SelectItem value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</SelectItem>
              <SelectItem value="returned">{isRTL ? "مرتجع" : "Returned"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate(`/client/delivery/orders/${id}/edit`)}>
            <Pencil className="h-4 w-4 me-2" />{isRTL ? "تعديل" : "Edit"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />{isRTL ? "معلومات العميل" : "Customer Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{order.customer_name}</span></div>
            {order.customer_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="tabular-nums">{order.customer_phone}</span></div>}
            {order.delivery_address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{order.delivery_address}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />{isRTL ? "تفاصيل التوصيل" : "Delivery Details"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="tabular-nums">{order.order_date}</span></div>
            <div><Label className="text-muted-foreground">{isRTL ? "السائق" : "Driver"}</Label><p className="font-medium">{isRTL ? order.delivery_drivers?.name : (order.delivery_drivers?.name_en || order.delivery_drivers?.name) || "-"}</p></div>
            <div><Label className="text-muted-foreground">{isRTL ? "المنطقة" : "Area"}</Label><p className="font-medium">{isRTL ? order.delivery_areas?.name : (order.delivery_areas?.name_en || order.delivery_areas?.name) || "-"}</p></div>
            {order.delivered_at && <div><Label className="text-muted-foreground">{isRTL ? "وقت التوصيل" : "Delivered At"}</Label><p className="tabular-nums">{new Date(order.delivered_at).toLocaleString()}</p></div>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "المالية" : "Financials"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center"><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الطلب" : "Order Total"}</p><p className="text-2xl font-bold tabular-nums">{Number(order.order_total).toLocaleString()}</p></div>
              <div className="text-center"><p className="text-sm text-muted-foreground">{isRTL ? "رسوم التوصيل" : "Delivery Fee"}</p><p className="text-2xl font-bold tabular-nums">{Number(order.delivery_fee).toLocaleString()}</p></div>
              <div className="text-center"><p className="text-sm text-muted-foreground">{isRTL ? "عمولة السائق" : "Driver Commission"}</p><p className="text-2xl font-bold tabular-nums">{Number(order.driver_commission).toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>

        {order.notes && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "ملاحظات" : "Notes"}</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{order.notes}</p></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ViewDeliveryOrder;
