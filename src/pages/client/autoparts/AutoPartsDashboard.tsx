import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, TrendingUp, AlertTriangle, DollarSign, ShoppingCart, BarChart3, Car } from "lucide-react";

const AutoPartsDashboard = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["auto-parts-dashboard", companyId],
    queryFn: async () => {
      // Total products
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("is_active", true);

      // Low stock items
      const { data: lowStockItems } = await supabase
        .from("products")
        .select("id, name, name_en, sku, oem_number, min_stock")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .not("min_stock", "is", null)
        .limit(100);

      // Check stock levels
      const { data: stockData } = await (supabase as any)
        .from("warehouse_stock")
        .select("product_id, quantity")
        .eq("company_id", companyId!);

      const stockMap: Record<string, number> = {};
      (stockData || []).forEach((s: any) => {
        stockMap[s.product_id] = (stockMap[s.product_id] || 0) + Number(s.quantity || 0);
      });

      const lowStock = (lowStockItems || []).filter((p: any) => {
        const qty = stockMap[p.id] || 0;
        return qty <= (p.min_stock || 0);
      });

      // Car brands count
      const { count: brandsCount } = await (supabase as any)
        .from("car_brands")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("is_active", true);

      // Car models count
      const { count: modelsCount } = await (supabase as any)
        .from("car_models")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("is_active", true);

      // Today's sales
      const today = new Date().toISOString().slice(0, 10);
      const { data: todaySales } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId!)
        .eq("invoice_date", today)
        .eq("type", "sale");

      const totalSalesToday = (todaySales || []).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);

      // Today's purchases
      const { data: todayPurchases } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId!)
        .eq("invoice_date", today)
        .eq("type", "purchase");

      const totalPurchasesToday = (todayPurchases || []).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);

      // Top selling products (recent sales)
      const { data: recentSaleItems } = await (supabase as any)
        .from("invoice_items")
        .select("product_id, quantity, products(name, name_en, sku)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(50);

      const productSales: Record<string, { name: string; sku: string; qty: number }> = {};
      (recentSaleItems || []).forEach((item: any) => {
        if (!item.product_id) return;
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            name: isRTL ? item.products?.name : (item.products?.name_en || item.products?.name) || "—",
            sku: item.products?.sku || "",
            qty: 0,
          };
        }
        productSales[item.product_id].qty += Number(item.quantity || 0);
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      return {
        totalProducts: totalProducts || 0,
        lowStockCount: lowStock.length,
        lowStockItems: lowStock.slice(0, 5),
        brandsCount: brandsCount || 0,
        modelsCount: modelsCount || 0,
        totalSalesToday,
        totalPurchasesToday,
        profitToday: totalSalesToday - totalPurchasesToday,
        topProducts,
      };
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "لوحة تحكم قطع الغيار" : "Auto Parts Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">{isRTL ? "نظرة عامة على عمليات قطع الغيار" : "Overview of auto parts operations"}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي القطع" : "Total Parts"}</p>
              <p className="text-2xl font-bold">{stats?.totalProducts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "مبيعات اليوم" : "Sales Today"}</p>
              <p className="text-2xl font-bold">{stats?.totalSalesToday.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10"><ShoppingCart className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "مشتريات اليوم" : "Purchases Today"}</p>
              <p className="text-2xl font-bold">{stats?.totalPurchasesToday.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "نقص المخزون" : "Low Stock"}</p>
              <p className="text-2xl font-bold">{stats?.lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10"><Car className="h-5 w-5 text-purple-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "الماركات" : "Brands"}</p>
              <p className="text-2xl font-bold">{stats?.brandsCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10"><Car className="h-5 w-5 text-indigo-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "الموديلات" : "Models"}</p>
              <p className="text-2xl font-bold">{stats?.modelsCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10"><DollarSign className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "ربح اليوم" : "Profit Today"}</p>
              <p className="text-2xl font-bold">{stats?.profitToday.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {isRTL ? "الأكثر مبيعاً" : "Top Selling Parts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topProducts?.length ? (
              <div className="space-y-3">
                {stats.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                    </div>
                    <Badge variant="secondary">{p.qty} {isRTL ? "قطعة" : "pcs"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {isRTL ? "تنبيهات نقص المخزون" : "Low Stock Alerts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lowStockItems?.length ? (
              <div className="space-y-3">
                {stats.lowStockItems.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div>
                      <p className="font-medium text-sm">{isRTL ? p.name : (p.name_en || p.name)}</p>
                      {p.oem_number && <p className="text-xs text-muted-foreground font-mono">OEM: {p.oem_number}</p>}
                    </div>
                    <Badge variant="destructive" className="text-xs">{isRTL ? "نقص" : "Low"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? "لا توجد تنبيهات" : "No alerts"}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AutoPartsDashboard;
