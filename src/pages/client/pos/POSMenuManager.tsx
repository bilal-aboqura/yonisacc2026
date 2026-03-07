import { useState, useRef } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MenuSquare, UtensilsCrossed, ShoppingBag, Truck, Save, Upload, Image } from "lucide-react";
import BranchSelector from "@/components/client/BranchSelector";

const POSMenuManager = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [menuDialog, setMenuDialog] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [form, setForm] = useState({ name: "", name_en: "", is_active: true });
  const [activeTab, setActiveTab] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});
  const [priceDirty, setPriceDirty] = useState(false);

  const { data: menus } = useQuery({
    queryKey: ["pos-menus", companyId, selectedBranch],
    queryFn: async () => {
      let query = supabase.from("pos_menus" as any).select("*").eq("company_id", companyId!);
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      const { data } = await query.order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch products with categories
  const { data: products } = useQuery({
    queryKey: ["pos-menu-products", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_categories(name, name_en, image_url)")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["pos-menu-categories", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch menu prices
  const { data: menuPrices } = useQuery({
    queryKey: ["pos-menu-prices", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pos_menu_prices" as any)
        .select("*")
        .eq("company_id", companyId!);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch BOMs for recipe linking
  const { data: boms } = useQuery({
    queryKey: ["pos-boms", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bill_of_materials")
        .select("*, bom_items(*, products(name, name_en))")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const getPrice = (productId: string, orderType: string) => {
    const editKey = `${productId}_${orderType}`;
    if (priceEdits[editKey] !== undefined) return priceEdits[editKey];
    const existing = menuPrices?.find((p: any) => p.product_id === productId && p.order_type === orderType);
    if (existing) return existing.price;
    const product = products?.find((p: any) => p.id === productId);
    return product?.sale_price || 0;
  };

  const updatePrice = (productId: string, orderType: string, price: number) => {
    setPriceEdits(prev => ({ ...prev, [`${productId}_${orderType}`]: price }));
    setPriceDirty(true);
  };

  const savePricesMutation = useMutation({
    mutationFn: async () => {
      const upserts = Object.entries(priceEdits).map(([key, price]) => {
        const [product_id, order_type] = key.split("_");
        return { company_id: companyId, product_id, order_type, price, is_active: true };
      });
      if (upserts.length === 0) return;
      const { error } = await supabase.from("pos_menu_prices" as any).upsert(upserts as any, { onConflict: "company_id,product_id,order_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ الأسعار" : "Prices saved");
      setPriceEdits({});
      setPriceDirty(false);
      queryClient.invalidateQueries({ queryKey: ["pos-menu-prices"] });
    },
    onError: () => toast.error(isRTL ? "خطأ في حفظ الأسعار" : "Error saving prices"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, branch_id: selectedBranch } as any;
      if (editingMenu) {
        const { error } = await supabase.from("pos_menus" as any).update(payload).eq("id", editingMenu.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pos_menus" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setMenuDialog(false);
      setEditingMenu(null);
      queryClient.invalidateQueries({ queryKey: ["pos-menus"] });
    },
    onError: () => toast.error(isRTL ? "خطأ" : "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_menus" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["pos-menus"] });
    },
  });

  const getProductBom = (productId: string) => {
    return boms?.find((b: any) => b.product_id === productId);
  };

  const orderTypeLabel = (type: string) => {
    switch (type) {
      case "dine_in": return isRTL ? "محلي" : "Dine In";
      case "takeaway": return isRTL ? "سفري" : "Takeaway";
      case "delivery": return isRTL ? "توصيل" : "Delivery";
      default: return type;
    }
  };

  // Group products by category
  const groupedProducts = (categories || []).map((cat: any) => ({
    ...cat,
    products: (products || []).filter((p: any) => p.category_id === cat.id),
  })).filter(g => g.products.length > 0);

  const uncategorized = (products || []).filter((p: any) => !p.category_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة المنيو" : "Menu Management"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إدارة أسعار المنيو حسب نوع الطلب (محلي - سفري - توصيل)" : "Manage menu pricing by order type (Dine In - Takeaway - Delivery)"}</p>
        </div>
      </div>

      {/* Order Type Tabs for Pricing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isRTL ? "تسعير المنيو" : "Menu Pricing"}</CardTitle>
              <CardDescription>{isRTL ? "تعديل أسعار المنتجات لكل فئة طلب" : "Edit product prices for each order type"}</CardDescription>
            </div>
            {priceDirty && (
              <Button onClick={() => savePricesMutation.mutate()} disabled={savePricesMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {isRTL ? "حفظ الأسعار" : "Save Prices"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} dir={isRTL ? "rtl" : "ltr"}>
            <TabsList className="mb-4">
              <TabsTrigger value="dine_in" className="gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                {isRTL ? "محلي" : "Dine In"}
              </TabsTrigger>
              <TabsTrigger value="takeaway" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                {isRTL ? "سفري" : "Takeaway"}
              </TabsTrigger>
              <TabsTrigger value="delivery" className="gap-2">
                <Truck className="h-4 w-4" />
                {isRTL ? "توصيل" : "Delivery"}
              </TabsTrigger>
            </TabsList>

            {["dine_in", "takeaway", "delivery"].map(orderType => (
              <TabsContent key={orderType} value={orderType}>
                {groupedProducts.map((group: any) => (
                  <div key={group.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      {group.image_url ? (
                        <img src={group.image_url} alt="" className="h-6 w-6 rounded object-cover" />
                      ) : null}
                      <h3 className="font-semibold text-base">{isRTL ? group.name : group.name_en || group.name}</h3>
                      <Badge variant="outline" className="text-xs">{group.products.length}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{isRTL ? "صورة" : "Image"}</TableHead>
                          <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                          <TableHead>{isRTL ? "السعر الأساسي" : "Base Price"}</TableHead>
                          <TableHead>{isRTL ? `سعر ${orderTypeLabel(orderType)}` : `${orderTypeLabel(orderType)} Price`}</TableHead>
                          <TableHead>{isRTL ? "الريسبي" : "Recipe"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.products.map((product: any) => {
                          const bom = getProductBom(product.id);
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                    <Image className="h-4 w-4 text-muted-foreground/40" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{isRTL ? product.name : product.name_en || product.name}</span>
                                  <span className="text-xs text-muted-foreground block">{product.sku}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{(product.sale_price || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={getPrice(product.id, orderType)}
                                  onChange={(e) => updatePrice(product.id, orderType, Number(e.target.value))}
                                  className="w-28 h-8"
                                  min={0}
                                  step={0.01}
                                />
                              </TableCell>
                              <TableCell>
                                {bom ? (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    {(bom.bom_items || []).length} {isRTL ? "مكون" : "items"}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{isRTL ? "بدون ريسبي" : "No recipe"}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                {uncategorized.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-base mb-3">{isRTL ? "بدون تصنيف" : "Uncategorized"}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{isRTL ? "صورة" : "Image"}</TableHead>
                          <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                          <TableHead>{isRTL ? "السعر الأساسي" : "Base Price"}</TableHead>
                          <TableHead>{isRTL ? `سعر ${orderTypeLabel(orderType)}` : `${orderTypeLabel(orderType)} Price`}</TableHead>
                          <TableHead>{isRTL ? "الريسبي" : "Recipe"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uncategorized.map((product: any) => {
                          const bom = getProductBom(product.id);
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                    <Image className="h-4 w-4 text-muted-foreground/40" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{isRTL ? product.name : product.name_en || product.name}</span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{(product.sale_price || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={getPrice(product.id, orderType)}
                                  onChange={(e) => updatePrice(product.id, orderType, Number(e.target.value))}
                                  className="w-28 h-8"
                                  min={0}
                                  step={0.01}
                                />
                              </TableCell>
                              <TableCell>
                                {bom ? (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    {(bom.bom_items || []).length} {isRTL ? "مكون" : "items"}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{isRTL ? "بدون ريسبي" : "No recipe"}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {(products || []).length === 0 && (
                  <div className="py-16 text-center text-muted-foreground">
                    <MenuSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {isRTL ? "لا توجد منتجات" : "No products found"}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Menus per Branch */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isRTL ? "قوائم الفروع" : "Branch Menus"}</CardTitle>
              <CardDescription>{isRTL ? "إدارة قوائم الطعام المخصصة لكل فرع" : "Manage branch-specific menus"}</CardDescription>
            </div>
            <Button onClick={() => { setEditingMenu(null); setForm({ name: "", name_en: "", is_active: true }); setMenuDialog(true); }} disabled={!selectedBranch} size="sm">
              <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة منيو" : "Add Menu"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <BranchSelector companyId={companyId!} value={selectedBranch} onChange={setSelectedBranch} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(menus || []).map((menu: any) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">{menu.name}</TableCell>
                  <TableCell>{menu.name_en || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={menu.is_active ? "default" : "secondary"}>
                      {menu.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingMenu(menu); setForm({ name: menu.name, name_en: menu.name_en || "", is_active: menu.is_active }); setMenuDialog(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(menu.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(menus || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <MenuSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {selectedBranch ? (isRTL ? "لا توجد قوائم" : "No menus found") : (isRTL ? "اختر فرع أولاً" : "Select a branch first")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={menuDialog} onOpenChange={setMenuDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editingMenu ? (isRTL ? "تعديل منيو" : "Edit Menu") : (isRTL ? "إضافة منيو" : "Add Menu")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{isRTL ? "الاسم بالعربي" : "Name (Arabic)"}</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (English)"}</Label><Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{isRTL ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMenuDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSMenuManager;
