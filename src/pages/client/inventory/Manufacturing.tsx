import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Factory, CheckCircle, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FormView = "list" | "new-order" | "new-bom";

const Manufacturing = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<FormView>("list");

  const { data: boms = [], isLoading: bomsLoading } = useQuery({
    queryKey: ["bill_of_materials", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("bill_of_materials" as any) as any).select("*, products(name, name_en)").eq("company_id", companyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["manufacturing_orders", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("manufacturing_orders" as any) as any).select("*, products(name, name_en), bill_of_materials(products(name, name_en)), branches(name, name_en)").eq("company_id", companyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-all", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, name_en, product_type, purchase_price").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const [bomForm, setBomForm] = useState({ product_id: "", notes: "", items: [{ product_id: "", quantity: 1 }] });
  const [orderForm, setOrderForm] = useState({ bom_id: "", branch_id: "", order_date: new Date().toISOString().split("T")[0], quantity: 1, notes: "" });

  const resetBomForm = () => setBomForm({ product_id: "", notes: "", items: [{ product_id: "", quantity: 1 }] });
  const resetOrderForm = () => setOrderForm({ bom_id: "", branch_id: "", order_date: new Date().toISOString().split("T")[0], quantity: 1, notes: "" });

  const createBomMutation = useMutation({
    mutationFn: async () => {
      const { data: bom, error } = await (supabase.from("bill_of_materials" as any) as any).insert({
        company_id: companyId, product_id: bomForm.product_id, notes: bomForm.notes || null,
      } as any).select().single();
      if (error) throw error;

      const items = bomForm.items.filter(i => i.product_id && i.quantity > 0).map(i => ({ bom_id: bom.id, product_id: i.product_id, quantity: i.quantity }));
      if (items.length > 0) await (supabase.from("bom_items" as any) as any).insert(items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill_of_materials"] });
      toast.success(isRTL ? "تم إنشاء قائمة المواد" : "BOM created");
      setView("list");
      resetBomForm();
    },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error"),
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const bom = boms.find((b: any) => b.id === orderForm.bom_id);
      const count = orders.length + 1;
      const num = `MFG-${String(count).padStart(4, "0")}`;

      await (supabase.from("manufacturing_orders" as any) as any).insert({
        company_id: companyId, branch_id: orderForm.branch_id, order_number: num,
        bom_id: orderForm.bom_id, product_id: (bom as any)?.product_id,
        quantity: orderForm.quantity, status: "draft", notes: orderForm.notes || null, created_by: user?.id,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing_orders"] });
      toast.success(isRTL ? "تم إنشاء أمر التصنيع" : "Manufacturing order created");
      setView("list");
      resetOrderForm();
    },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error"),
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: order } = await (supabase.from("manufacturing_orders" as any) as any).select("*").eq("id", orderId).single();
      if (!order) throw new Error("Not found");

      const { data: bomItems } = await (supabase.from("bom_items" as any) as any).select("*, products(purchase_price)").eq("bom_id", (order as any).bom_id);
      const { data: warehouse } = await supabase.from("warehouses").select("id").eq("branch_id", (order as any).branch_id).eq("company_id", companyId!).single();

      let totalCost = 0;
      for (const bi of bomItems || []) {
        const qtyNeeded = bi.quantity * (order as any).quantity;
        totalCost += qtyNeeded * ((bi.products as any)?.purchase_price || 0);

        const { data: stock } = await supabase.from("product_stock").select("*").eq("product_id", bi.product_id).eq("warehouse_id", warehouse?.id).single();
        if (stock) await supabase.from("product_stock").update({ quantity: (stock.quantity || 0) - qtyNeeded } as any).eq("id", stock.id);

        await supabase.from("stock_movements").insert({
          company_id: companyId, warehouse_id: warehouse?.id, product_id: bi.product_id,
          movement_type: "manufacturing_out", quantity: -qtyNeeded,
          reference_type: "manufacturing", reference_id: orderId, created_by: user?.id,
        } as any);
      }

      const { data: finishedStock } = await supabase.from("product_stock").select("*").eq("product_id", (order as any).product_id).eq("warehouse_id", warehouse?.id).single();
      if (finishedStock) {
        await supabase.from("product_stock").update({ quantity: (finishedStock.quantity || 0) + (order as any).quantity } as any).eq("id", finishedStock.id);
      } else {
        await supabase.from("product_stock").insert({ product_id: (order as any).product_id, warehouse_id: warehouse?.id, quantity: (order as any).quantity } as any);
      }

      await supabase.from("stock_movements").insert({
        company_id: companyId, warehouse_id: warehouse?.id, product_id: (order as any).product_id,
        movement_type: "manufacturing_in", quantity: (order as any).quantity,
        reference_type: "manufacturing", reference_id: orderId, created_by: user?.id,
      } as any);

      await (supabase.from("manufacturing_orders" as any) as any).update({
        status: "completed", production_cost: totalCost, completed_at: new Date().toISOString(),
      } as any).eq("id", orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing_orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success(isRTL ? "تم إكمال أمر التصنيع" : "Manufacturing order completed");
    },
    onError: () => toast.error(isRTL ? "حدث خطأ" : "Error"),
  });

  const canManage = can("MANAGE_MANUFACTURING");

  const statusBadge = (status: string) => {
    const v: Record<string, string> = { draft: "secondary", in_progress: "outline", completed: "default", cancelled: "destructive" };
    const l: Record<string, Record<string, string>> = {
      draft: { ar: "مسودة", en: "Draft" }, in_progress: { ar: "قيد التنفيذ", en: "In Progress" },
      completed: { ar: "مكتمل", en: "Completed" }, cancelled: { ar: "ملغي", en: "Cancelled" },
    };
    return <Badge variant={v[status] as any}>{isRTL ? l[status]?.ar : l[status]?.en || status}</Badge>;
  };

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  // New BOM form view
  if (view === "new-bom") {
    return (
      <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Button variant="ghost" size="icon" onClick={() => { setView("list"); resetBomForm(); }}>
            <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
          </Button>
          <Factory className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "قائمة مواد جديدة" : "New Bill of Materials"}</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>{isRTL ? "المنتج النهائي" : "Final Product"} *</Label>
              <Select value={bomForm.product_id} onValueChange={v => setBomForm(f => ({ ...f, product_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                <SelectContent>
                  {products.filter((p: any) => p.product_type === "manufacturing").map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className={cn("flex items-center justify-between mb-3", isRTL && "flex-row-reverse")}>
                <Label className="text-base font-semibold">{isRTL ? "المواد الخام" : "Raw Materials"}</Label>
                <Button size="sm" variant="outline" onClick={() => setBomForm(f => ({ ...f, items: [...f.items, { product_id: "", quantity: 1 }] }))} className="gap-1">
                  <Plus className="h-3 w-3" />
                  {isRTL ? "إضافة" : "Add"}
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "المادة" : "Material"}</TableHead>
                      <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomForm.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={item.product_id} onValueChange={v => setBomForm(f => ({ ...f, items: f.items.map((i, j) => j === idx ? { ...i, product_id: v } : i) }))}>
                            <SelectTrigger><SelectValue placeholder={isRTL ? "مادة" : "Material"} /></SelectTrigger>
                            <SelectContent>
                              {products.filter((p: any) => p.product_type === "stock").map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{isRTL ? p.name : p.name_en || p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} value={item.quantity} onChange={e => setBomForm(f => ({ ...f, items: f.items.map((i, j) => j === idx ? { ...i, quantity: parseFloat(e.target.value) || 0 } : i) }))} className="w-28 text-end tabular-nums" />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setBomForm(f => ({ ...f, items: f.items.filter((_, j) => j !== idx) }))} disabled={bomForm.items.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className={cn("flex gap-3 pt-4", isRTL ? "flex-row-reverse" : "")}>
              <Button variant="outline" onClick={() => { setView("list"); resetBomForm(); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => createBomMutation.mutate()} disabled={createBomMutation.isPending || !bomForm.product_id}>
                {isRTL ? "حفظ" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // New Order form view
  if (view === "new-order") {
    return (
      <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Button variant="ghost" size="icon" onClick={() => { setView("list"); resetOrderForm(); }}>
            <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
          </Button>
          <Factory className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{isRTL ? "أمر تصنيع جديد" : "New Manufacturing Order"}</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{isRTL ? "قائمة المواد (BOM)" : "BOM"} *</Label>
                <Select value={orderForm.bom_id} onValueChange={v => setOrderForm(f => ({ ...f, bom_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {boms.filter((b: any) => b.is_active).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.products ? (isRTL ? b.products.name : b.products.name_en || b.products.name) : b.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "الفرع" : "Branch"} *</Label>
                <Select value={orderForm.branch_id} onValueChange={v => setOrderForm(f => ({ ...f, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{isRTL ? "تاريخ الأمر" : "Order Date"} *</Label>
                <Input type="date" value={orderForm.order_date} onChange={e => setOrderForm(f => ({ ...f, order_date: e.target.value }))} />
              </div>
              <div>
                <Label>{isRTL ? "الكمية" : "Quantity"} *</Label>
                <Input type="number" min={1} value={orderForm.quantity} onChange={e => setOrderForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="tabular-nums" />
              </div>
            </div>

            <div className={cn("flex gap-3 pt-4", isRTL ? "flex-row-reverse" : "")}>
              <Button variant="outline" onClick={() => { setView("list"); resetOrderForm(); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending || !orderForm.bom_id || !orderForm.branch_id}>
                {isRTL ? "حفظ" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Factory className="h-7 w-7 text-primary" />
          {isRTL ? "التصنيع" : "Manufacturing"}
        </h1>
        <p className="text-muted-foreground mt-1">{isRTL ? "إدارة قوائم المواد وأوامر التصنيع" : "Manage bills of materials and manufacturing orders"}</p>
      </div>

      <Tabs defaultValue="orders" dir={isRTL ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="orders">{isRTL ? "أوامر التصنيع" : "Orders"}</TabsTrigger>
          <TabsTrigger value="bom">{isRTL ? "قوائم المواد (BOM)" : "Bill of Materials"}</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setView("new-order")} className="gap-2">
                <Plus className="h-4 w-4" />
                {isRTL ? "أمر تصنيع جديد" : "New Order"}
              </Button>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الرقم" : "Number"}</TableHead>
                    <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "تكلفة الإنتاج" : "Cost"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "الحالة" : "Status"}</TableHead>
                    {canManage && <TableHead className="text-center">{isRTL ? "إجراء" : "Action"}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Factory className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد أوامر" : "No orders yet"}</p>
                        {canManage && (
                          <Button className="mt-3 gap-2" size="sm" onClick={() => setView("new-order")}>
                            <Plus className="h-4 w-4" />
                            {isRTL ? "أمر جديد" : "New Order"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium font-mono text-sm">{o.order_number}</TableCell>
                      <TableCell>{o.products ? (isRTL ? o.products.name : o.products.name_en || o.products.name) : "-"}</TableCell>
                      <TableCell className="text-end tabular-nums">{o.quantity}</TableCell>
                      <TableCell>{o.branches ? (isRTL ? o.branches.name : o.branches.name_en || o.branches.name) : "-"}</TableCell>
                      <TableCell className="text-end tabular-nums">{o.production_cost ? o.production_cost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</TableCell>
                      <TableCell className="text-center">{statusBadge(o.status)}</TableCell>
                      {canManage && (
                        <TableCell className="text-center">
                          {o.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => completeOrderMutation.mutate(o.id)} disabled={completeOrderMutation.isPending} className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {isRTL ? "تنفيذ" : "Complete"}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!ordersLoading && orders.length > 0 && (
                <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                  {isRTL ? `إجمالي الأوامر: ${orders.length}` : `Total orders: ${orders.length}`}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bom" className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setView("new-bom")} className="gap-2">
                <Plus className="h-4 w-4" />
                {isRTL ? "قائمة مواد جديدة" : "New BOM"}
              </Button>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "المنتج النهائي" : "Final Product"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "نشط" : "Active"}</TableHead>
                    <TableHead>{isRTL ? "تاريخ الإنشاء" : "Created"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : boms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <Factory className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground font-medium">{isRTL ? "لا توجد قوائم" : "No BOMs yet"}</p>
                        {canManage && (
                          <Button className="mt-3 gap-2" size="sm" onClick={() => setView("new-bom")}>
                            <Plus className="h-4 w-4" />
                            {isRTL ? "قائمة جديدة" : "New BOM"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : boms.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.products ? (isRTL ? b.products.name : b.products.name_en || b.products.name) : "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? (isRTL ? "نعم" : "Yes") : (isRTL ? "لا" : "No")}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(b.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!bomsLoading && boms.length > 0 && (
                <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                  {isRTL ? `إجمالي القوائم: ${boms.length}` : `Total BOMs: ${boms.length}`}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Manufacturing;
