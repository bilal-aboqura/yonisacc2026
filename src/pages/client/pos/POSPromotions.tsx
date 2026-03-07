import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Gift, X, Save } from "lucide-react";

const POSPromotions = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", name_en: "", type: "percentage", value: 0, min_amount: 0,
    start_date: "", end_date: "", is_active: true,
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const { data: promotions } = useQuery({
    queryKey: ["pos-promotions", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("pos_promotions" as any).select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-promos", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, name_en, sku").eq("company_id", companyId!).eq("is_active", true).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: promoProducts } = useQuery({
    queryKey: ["pos-promotion-products", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("pos_promotion_products" as any).select("*").eq("company_id", companyId!);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Load selected products when editing
  useEffect(() => {
    if (editing && promoProducts) {
      const linked = promoProducts.filter((p: any) => p.promotion_id === editing.id).map((p: any) => p.product_id);
      setSelectedProducts(linked);
    }
  }, [editing, promoProducts]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId } as any;
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;

      let promoId: string;
      if (editing) {
        const { error } = await supabase.from("pos_promotions" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        promoId = editing.id;
      } else {
        const { data, error } = await supabase.from("pos_promotions" as any).insert(payload as any).select("id").single();
        if (error) throw error;
        promoId = (data as any).id;
      }

      // Update product links
      await supabase.from("pos_promotion_products" as any).delete().eq("promotion_id", promoId);
      if (selectedProducts.length > 0) {
        const links = selectedProducts.map(pid => ({ promotion_id: promoId, product_id: pid, company_id: companyId }));
        await supabase.from("pos_promotion_products" as any).insert(links as any);
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setShowForm(false); setEditing(null); setSelectedProducts([]);
      queryClient.invalidateQueries({ queryKey: ["pos-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["pos-promotion-products"] });
    },
    onError: () => toast.error(isRTL ? "خطأ" : "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_promotions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["pos-promotions"] });
    },
  });

  const openEdit = (promo: any) => {
    setEditing(promo);
    setForm({
      name: promo.name, name_en: promo.name_en || "", type: promo.type,
      value: promo.value, min_amount: promo.min_amount || 0,
      start_date: promo.start_date || "", end_date: promo.end_date || "", is_active: promo.is_active,
    });
    setShowForm(true);
  };

  const toggleProduct = (pid: string) => {
    setSelectedProducts(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  };

  const typeLabels: Record<string, { ar: string; en: string }> = {
    percentage: { ar: "نسبة مئوية", en: "Percentage" },
    fixed: { ar: "مبلغ ثابت", en: "Fixed Amount" },
    buy_x_get_y: { ar: "اشتر X واحصل Y", en: "Buy X Get Y" },
  };

  const getLinkedCount = (promoId: string) => (promoProducts || []).filter((p: any) => p.promotion_id === promoId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "العروض والخصومات" : "Promotions & Discounts"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إدارة العروض الترويجية والخصومات" : "Manage promotions and discounts"}</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditing(null); setForm({ name: "", name_en: "", type: "percentage", value: 0, min_amount: 0, start_date: "", end_date: "", is_active: true }); setSelectedProducts([]); setShowForm(true); }}>
            <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة عرض" : "Add Promotion"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editing ? (isRTL ? "تعديل عرض" : "Edit Promotion") : (isRTL ? "إضافة عرض" : "Add Promotion")}</h2>
            <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><Label>{isRTL ? "الاسم بالعربي" : "Name (Arabic)"}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (English)"}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div>
              <Label>{isRTL ? "النوع" : "Type"}</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{isRTL ? "نسبة مئوية" : "Percentage"}</SelectItem>
                  <SelectItem value="fixed">{isRTL ? "مبلغ ثابت" : "Fixed Amount"}</SelectItem>
                  <SelectItem value="buy_x_get_y">{isRTL ? "اشتر X واحصل Y" : "Buy X Get Y"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{isRTL ? "القيمة" : "Value"}</Label><Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>{isRTL ? "من تاريخ" : "Start Date"}</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><Label>{isRTL ? "إلى تاريخ" : "End Date"}</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            <Label>{isRTL ? "نشط" : "Active"}</Label>
          </div>

          {/* Product Selection */}
          <div className="mt-6">
            <Label className="text-base font-semibold">{isRTL ? "المنتجات المرتبطة" : "Linked Products"}</Label>
            <p className="text-xs text-muted-foreground mb-2">{isRTL ? "اترك فارغاً لتطبيق العرض على جميع المنتجات" : "Leave empty to apply to all products"}</p>
            <ScrollArea className="max-h-[200px] border rounded-md p-2">
              <div className="space-y-1">
                {(products || []).map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedProducts.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                    <span className="text-sm">{isRTL ? p.name : p.name_en || p.name}</span>
                    {p.sku && <span className="text-xs text-muted-foreground">({p.sku})</span>}
                  </label>
                ))}
              </div>
            </ScrollArea>
            {selectedProducts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{isRTL ? `${selectedProducts.length} منتج محدد` : `${selectedProducts.length} product(s) selected`}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
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
              <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
              <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
              <TableHead>{isRTL ? "القيمة" : "Value"}</TableHead>
              <TableHead>{isRTL ? "المنتجات" : "Products"}</TableHead>
              <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(promotions || []).map((promo: any) => (
              <TableRow key={promo.id}>
                <TableCell className="font-medium">{isRTL ? promo.name : promo.name_en || promo.name}</TableCell>
                <TableCell><Badge variant="outline">{isRTL ? typeLabels[promo.type]?.ar : typeLabels[promo.type]?.en}</Badge></TableCell>
                <TableCell>{promo.type === "percentage" ? `${promo.value}%` : promo.value}</TableCell>
                <TableCell>
                  {getLinkedCount(promo.id) > 0
                    ? <Badge variant="secondary">{getLinkedCount(promo.id)} {isRTL ? "منتج" : "products"}</Badge>
                    : <span className="text-xs text-muted-foreground">{isRTL ? "الكل" : "All"}</span>}
                </TableCell>
                <TableCell className="text-xs">{promo.start_date && promo.end_date ? `${promo.start_date} → ${promo.end_date}` : "-"}</TableCell>
                <TableCell><Badge variant={promo.is_active ? "default" : "secondary"}>{promo.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(promo)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(promo.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(promotions || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <Gift className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {isRTL ? "لا توجد عروض" : "No promotions found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default POSPromotions;
