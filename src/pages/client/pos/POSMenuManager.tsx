import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { MenuSquare, UtensilsCrossed, ShoppingBag, Truck, Save, Image, Loader2 } from "lucide-react";

const POSMenuManager = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});
  const [posToggleEdits, setPosToggleEdits] = useState<Record<string, boolean>>({});

  const isDirty = Object.keys(priceEdits).length > 0 || Object.keys(posToggleEdits).length > 0;

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

  const getShowInPos = (productId: string) => {
    if (posToggleEdits[productId] !== undefined) return posToggleEdits[productId];
    const product = products?.find((p: any) => p.id === productId);
    return (product as any)?.show_in_pos !== false;
  };

  const updatePrice = (productId: string, orderType: string, price: number) => {
    setPriceEdits(prev => ({ ...prev, [`${productId}_${orderType}`]: price }));
  };

  const toggleShowInPos = (productId: string, value: boolean) => {
    setPosToggleEdits(prev => ({ ...prev, [productId]: value }));
  };

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      // Save prices
      const priceUpserts = Object.entries(priceEdits).map(([key, price]) => {
        const [product_id, order_type] = key.split("_");
        return { company_id: companyId, product_id, order_type, price, is_active: true };
      });
      if (priceUpserts.length > 0) {
        const { error } = await supabase.from("pos_menu_prices" as any).upsert(priceUpserts as any, { onConflict: "company_id,product_id,order_type" });
        if (error) throw error;
      }

      // Save POS visibility toggles
      for (const [productId, showInPos] of Object.entries(posToggleEdits)) {
        const { error } = await supabase
          .from("products")
          .update({ show_in_pos: showInPos } as any)
          .eq("id", productId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ التغييرات" : "Changes saved");
      setPriceEdits({});
      setPosToggleEdits({});
      queryClient.invalidateQueries({ queryKey: ["pos-menu-prices"] });
      queryClient.invalidateQueries({ queryKey: ["pos-menu-products"] });
    },
    onError: () => toast.error(isRTL ? "خطأ في الحفظ" : "Error saving"),
  });

  const getProductBom = (productId: string) => boms?.find((b: any) => b.product_id === productId);

  const orderTypeLabel = (type: string) => {
    switch (type) {
      case "dine_in": return isRTL ? "محلي" : "Dine In";
      case "takeaway": return isRTL ? "سفري" : "Takeaway";
      case "delivery": return isRTL ? "توصيل" : "Delivery";
      default: return type;
    }
  };

  const groupedProducts = useMemo(() => (categories || []).map((cat: any) => ({
    ...cat,
    products: (products || []).filter((p: any) => p.category_id === cat.id),
  })).filter((g: any) => g.products.length > 0), [categories, products]);

  const uncategorized = useMemo(() => (products || []).filter((p: any) => !p.category_id), [products]);

  const renderProductRow = (product: any, index: number, orderType: string) => {
    const bom = getProductBom(product.id);
    const currentPrice = getPrice(product.id, orderType);
    const basePrice = product.sale_price || 0;
    const costPrice = product.purchase_price || 0;
    const priceDiff = currentPrice - basePrice;
    const showInPos = getShowInPos(product.id);

    return (
      <TableRow key={product.id} className={index % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}>
        <TableCell className="w-[60px]">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-border/50 shadow-sm" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center border border-border/30">
              <Image className="h-4 w-4 text-muted-foreground/30" />
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="min-w-[140px]">
            <p className="font-medium text-foreground leading-tight">{isRTL ? product.name : product.name_en || product.name}</p>
            {product.sku && <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>}
          </div>
        </TableCell>
        <TableCell className="text-end tabular-nums text-muted-foreground/60 w-[100px]">
          {costPrice.toFixed(2)}
        </TableCell>
        <TableCell className="text-end tabular-nums text-muted-foreground font-medium w-[100px]">
          {basePrice.toFixed(2)}
        </TableCell>
        <TableCell className="w-[160px]">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={currentPrice}
              onChange={(e) => updatePrice(product.id, orderType, Number(e.target.value))}
              className="w-28 h-9 text-end tabular-nums font-medium"
              min={0}
              step={0.01}
            />
            {priceDiff !== 0 && (
              <span className={`text-[10px] font-semibold whitespace-nowrap ${priceDiff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(2)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="w-[100px]">
          {bom ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1">
              <UtensilsCrossed className="h-3 w-3" />
              {(bom.bom_items || []).length} {isRTL ? "مكون" : "items"}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </TableCell>
        <TableCell className="w-[70px] text-center">
          <Switch
            checked={showInPos}
            onCheckedChange={(v) => toggleShowInPos(product.id, v)}
            className="data-[state=checked]:bg-primary"
          />
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (productsList: any[], orderType: string) => (
    <div className="overflow-auto rounded-lg border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">#</TableHead>
            <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
            <TableHead className="text-end w-[100px]">{isRTL ? "التكلفة" : "Cost"}</TableHead>
            <TableHead className="text-end w-[100px]">{isRTL ? "سعر البيع" : "Sale Price"}</TableHead>
            <TableHead className="w-[160px]">{isRTL ? `سعر ${orderTypeLabel(orderType)}` : `${orderTypeLabel(orderType)} Price`}</TableHead>
            <TableHead className="w-[100px]">{isRTL ? "الريسبي" : "Recipe"}</TableHead>
            <TableHead className="w-[70px] text-center">{isRTL ? "POS" : "POS"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productsList.map((product: any, idx: number) => renderProductRow(product, idx, orderType))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة المنيو" : "Menu Management"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إدارة أسعار المنيو حسب نوع الطلب والتحكم في ظهور المنتجات" : "Manage menu pricing by order type and control product visibility"}</p>
        </div>
        {isDirty && (
          <Button onClick={() => saveAllMutation.mutate()} disabled={saveAllMutation.isPending} className="gap-2">
            {saveAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isRTL ? "حفظ التغييرات" : "Save Changes"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "تسعير المنيو" : "Menu Pricing"}</CardTitle>
          <CardDescription>{isRTL ? "تعديل أسعار المنتجات لكل فئة طلب والتحكم في ظهورها في نقاط البيع" : "Edit product prices for each order type and control POS visibility"}</CardDescription>
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
              <TabsContent key={orderType} value={orderType} className="space-y-6">
                {groupedProducts.map((group: any) => (
                  <div key={group.id}>
                    <div className="flex items-center gap-3 mb-3 px-1">
                      {group.image_url ? (
                        <img src={group.image_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-border/50 shadow-sm" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MenuSquare className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <h3 className="font-semibold text-sm text-foreground">{isRTL ? group.name : group.name_en || group.name}</h3>
                      <Badge variant="secondary" className="text-[10px] font-normal">{group.products.length}</Badge>
                    </div>
                    {renderTable(group.products, orderType)}
                  </div>
                ))}

                {uncategorized.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <MenuSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-sm text-foreground">{isRTL ? "بدون تصنيف" : "Uncategorized"}</h3>
                      <Badge variant="secondary" className="text-[10px] font-normal">{uncategorized.length}</Badge>
                    </div>
                    {renderTable(uncategorized, orderType)}
                  </div>
                )}

                {(products || []).length === 0 && (
                  <div className="py-16 text-center text-muted-foreground">
                    <MenuSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">{isRTL ? "لا توجد منتجات" : "No products found"}</p>
                    <p className="text-xs mt-1">{isRTL ? "أضف منتجات من المخزون أولاً" : "Add products from inventory first"}</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default POSMenuManager;
