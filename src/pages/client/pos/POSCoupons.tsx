import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Ticket, X, Save } from "lucide-react";

interface CouponForm {
  code: string; name: string; name_en: string;
  discount_type: string; discount_value: number;
  min_order_amount: number; max_uses: number | null;
  start_date: string; end_date: string; is_active: boolean;
}

const emptyForm: CouponForm = {
  code: "", name: "", name_en: "", discount_type: "percentage",
  discount_value: 0, min_order_amount: 0, max_uses: null,
  start_date: "", end_date: "", is_active: true,
};

const POSCoupons = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const { data: coupons } = useQuery({
    queryKey: ["pos-coupons", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("pos_coupons" as any).select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, max_uses: form.max_uses || null } as any;
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;
      if (editing) {
        const { error } = await supabase.from("pos_coupons" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pos_coupons" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setShowForm(false); setEditing(null); setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["pos-coupons"] });
    },
    onError: (e: any) => toast.error(e?.message?.includes("unique") ? (isRTL ? "كود الكوبون مستخدم" : "Coupon code already exists") : (isRTL ? "خطأ" : "Error")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_coupons" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? "تم الحذف" : "Deleted"); queryClient.invalidateQueries({ queryKey: ["pos-coupons"] }); },
  });

  const openEdit = (coupon: any) => {
    setEditing(coupon);
    setForm({
      code: coupon.code, name: coupon.name, name_en: coupon.name_en || "",
      discount_type: coupon.discount_type, discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0, max_uses: coupon.max_uses,
      start_date: coupon.start_date || "", end_date: coupon.end_date || "", is_active: coupon.is_active,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "الكوبونات" : "Coupons"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إدارة أكواد الخصم والكوبونات" : "Manage discount codes and coupons"}</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>
            <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة كوبون" : "Add Coupon"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editing ? (isRTL ? "تعديل كوبون" : "Edit Coupon") : (isRTL ? "كوبون جديد" : "New Coupon")}</h2>
            <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><Label>{isRTL ? "كود الكوبون" : "Coupon Code"}</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" /></div>
            <div><Label>{isRTL ? "الاسم بالعربي" : "Name (Arabic)"}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (English)"}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div>
              <Label>{isRTL ? "نوع الخصم" : "Discount Type"}</Label>
              <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{isRTL ? "نسبة مئوية" : "Percentage"}</SelectItem>
                  <SelectItem value="fixed">{isRTL ? "مبلغ ثابت" : "Fixed Amount"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{isRTL ? "القيمة" : "Value"}</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>{isRTL ? "الحد الأدنى للطلب" : "Min Order Amount"}</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>{isRTL ? "الحد الأقصى للاستخدام" : "Max Uses"}</Label><Input type="number" value={form.max_uses ?? ""} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? parseInt(e.target.value) : null }))} placeholder={isRTL ? "غير محدود" : "Unlimited"} /></div>
            <div><Label>{isRTL ? "من تاريخ" : "Start Date"}</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><Label>{isRTL ? "إلى تاريخ" : "End Date"}</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            <Label>{isRTL ? "نشط" : "Active"}</Label>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.code || !form.name}>
              <Save className="h-4 w-4 me-2" />
              {saveMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRTL ? "الكود" : "Code"}</TableHead>
              <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
              <TableHead>{isRTL ? "الخصم" : "Discount"}</TableHead>
              <TableHead>{isRTL ? "الاستخدام" : "Usage"}</TableHead>
              <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(coupons || []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell><Badge variant="outline" className="font-mono">{c.code}</Badge></TableCell>
                <TableCell className="font-medium">{isRTL ? c.name : c.name_en || c.name}</TableCell>
                <TableCell>{c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} ${isRTL ? "ر.س" : "SAR"}`}</TableCell>
                <TableCell>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                <TableCell className="text-xs">{c.start_date && c.end_date ? `${c.start_date} → ${c.end_date}` : "-"}</TableCell>
                <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(coupons || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <Ticket className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {isRTL ? "لا توجد كوبونات" : "No coupons found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default POSCoupons;
