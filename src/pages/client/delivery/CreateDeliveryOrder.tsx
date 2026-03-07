import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";

const CreateDeliveryOrder = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    order_number: "", customer_name: "", customer_phone: "", delivery_address: "",
    order_date: new Date().toISOString().split("T")[0], status: "pending",
    driver_id: "", area_id: "", branch_id: "", payment_method_id: "",
    delivery_fee: 0, order_total: 0, driver_commission: 0, notes: "",
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, name_en").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["delivery-drivers", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("delivery_drivers").select("id, name, name_en").eq("company_id", companyId).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["delivery-areas", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("delivery_areas").select("id, name, name_en, delivery_fee").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["active-payment-methods", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("payment_methods").select("id, name, name_en, code").eq("company_id", companyId).eq("is_active", true).not("account_id", "is", null);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: existing } = useQuery({
    queryKey: ["delivery-order", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("delivery_orders").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  // Auto-generate order number
  useQuery({
    queryKey: ["delivery-next-number", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("delivery_orders").select("order_number").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1);
      const last = data?.[0]?.order_number;
      const num = last ? parseInt(last.replace(/\D/g, "")) + 1 : 1;
      if (!isEdit) setForm(f => ({ ...f, order_number: `DEL-${String(num).padStart(5, "0")}` }));
      return num;
    },
    enabled: !!companyId && !isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        order_number: existing.order_number || "",
        customer_name: existing.customer_name || "",
        customer_phone: existing.customer_phone || "",
        delivery_address: existing.delivery_address || "",
        order_date: existing.order_date || "",
        status: existing.status || "pending",
        driver_id: existing.driver_id || "",
        area_id: existing.area_id || "",
        branch_id: existing.branch_id || "",
        payment_method_id: existing.payment_method_id || "",
        delivery_fee: existing.delivery_fee || 0,
        order_total: existing.order_total || 0,
        driver_commission: existing.driver_commission || 0,
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  // Auto-fill delivery fee from area
  useEffect(() => {
    if (form.area_id && !isEdit) {
      const area = areas.find((a: any) => a.id === form.area_id);
      if (area) setForm(f => ({ ...f, delivery_fee: Number(area.delivery_fee) || 0 }));
    }
  }, [form.area_id, areas, isEdit]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, company_id: companyId, updated_at: new Date().toISOString() };
      if (!payload.driver_id) payload.driver_id = null;
      if (!payload.area_id) payload.area_id = null;
      if (!payload.branch_id) payload.branch_id = null;
      if (!payload.payment_method_id) payload.payment_method_id = null;

      if (isEdit) {
        const { error } = await (supabase as any).from("delivery_orders").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("delivery_orders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ الطلب بنجاح" : "Order saved successfully");
      queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
      navigate("/client/delivery/orders");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/delivery/orders")}><BackIcon className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل الطلب" : "Edit Order") : (isRTL ? "طلب توصيل جديد" : "New Delivery Order")}</h1>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.customer_name}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ" : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "معلومات الطلب" : "Order Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRTL ? "رقم الطلب" : "Order Number"}</Label>
                <Input value={form.order_number} onChange={(e) => setForm(f => ({ ...f, order_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "تاريخ الطلب" : "Order Date"}</Label>
                <Input type="date" value={form.order_date} onChange={(e) => setForm(f => ({ ...f, order_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الفرع" : "Branch"}</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm(f => ({ ...f, branch_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الفرع" : "Select Branch"} /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
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

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "معلومات العميل" : "Customer Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "اسم العميل" : "Customer Name"} *</Label>
              <Input value={form.customer_name} onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "عنوان التوصيل" : "Delivery Address"}</Label>
              <Textarea value={form.delivery_address} onChange={(e) => setForm(f => ({ ...f, delivery_address: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Details */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "تفاصيل التوصيل" : "Delivery Details"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{isRTL ? "السائق" : "Driver"}</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm(f => ({ ...f, driver_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر السائق" : "Select Driver"} /></SelectTrigger>
                <SelectContent>{drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{isRTL ? d.name : d.name_en || d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "منطقة التوصيل" : "Delivery Area"}</Label>
              <Select value={form.area_id} onValueChange={(v) => setForm(f => ({ ...f, area_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر المنطقة" : "Select Area"} /></SelectTrigger>
                <SelectContent>{areas.map((a: any) => <SelectItem key={a.id} value={a.id}>{isRTL ? a.name : a.name_en || a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "طريقة الدفع" : "Payment Method"}</Label>
              <Select value={form.payment_method_id} onValueChange={(v) => setForm(f => ({ ...f, payment_method_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر طريقة الدفع" : "Select Payment Method"} /></SelectTrigger>
                <SelectContent>{paymentMethods.map((p: any) => <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{isRTL ? "المالية" : "Financials"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRTL ? "إجمالي الطلب" : "Order Total"}</Label>
                <Input type="number" min={0} value={form.order_total} onChange={(e) => setForm(f => ({ ...f, order_total: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "رسوم التوصيل" : "Delivery Fee"}</Label>
                <Input type="number" min={0} value={form.delivery_fee} onChange={(e) => setForm(f => ({ ...f, delivery_fee: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "عمولة السائق" : "Driver Commission"}</Label>
              <Input type="number" min={0} value={form.driver_commission} onChange={(e) => setForm(f => ({ ...f, driver_commission: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateDeliveryOrder;
