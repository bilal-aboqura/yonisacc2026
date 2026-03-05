import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Package, BarChart3, AlertTriangle, Eye, Pencil,
  Trash2, ToggleLeft, Loader2, Filter
} from "lucide-react";

interface ClientInventoryProps {
  tab?: string;
}

const ClientInventory = ({ tab }: ClientInventoryProps) => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { can } = useRBAC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-filter", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, name_en, is_main").eq("company_id", companyId!).eq("is_active", true).order("is_main", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, category:product_categories(name, name_en)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories-filter", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("id, name, name_en")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch stock summary
  const { data: stockMap = {} } = useQuery({
    queryKey: ["product-stock-summary", companyId, branchFilter],
    queryFn: async () => {
      let q = supabase
        .from("product_stock")
        .select("product_id, quantity, warehouses(branch_id)")
        .in("product_id", products.map(p => p.id));
      const { data } = await q;
      const map: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        if (branchFilter !== "all" && s.warehouses?.branch_id !== branchFilter) return;
        map[s.product_id] = (map[s.product_id] || 0) + (s.quantity || 0);
      });
      return map;
    },
    enabled: products.length > 0,
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: !isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(isRTL ? "تم التحديث" : "Updated");
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      setDeleteDialog({ open: false, id: "", name: "" });
    },
    onError: () => toast.error(isRTL ? "فشل الحذف" : "Delete failed"),
  });

  // Filter products
  const filtered = products.filter((p: any) => {
    const matchSearch = !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.category_id === categoryFilter;
    const matchType = typeFilter === "all" || p.product_type === typeFilter;
    const matchStatus = statusFilter === "all" ||
      (statusFilter === "active" && p.is_active) ||
      (statusFilter === "inactive" && !p.is_active);
    return matchSearch && matchCategory && matchType && matchStatus;
  });

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter((p: any) => p.is_active).length;
  const lowStockCount = products.filter((p: any) => {
    const stock = stockMap[p.id] || 0;
    return p.is_active && !p.is_service && p.product_type !== "service" && stock <= (p.reorder_level || p.min_stock || 0) && (p.reorder_level || p.min_stock || 0) > 0;
  }).length;
  const totalValue = products.reduce((sum: number, p: any) => {
    if (p.is_service || p.product_type === "service") return sum;
    return sum + (stockMap[p.id] || 0) * (p.purchase_price || 0);
  }, 0);

  const stats = [
    { title: isRTL ? "إجمالي المنتجات" : "Total Products", value: totalProducts, icon: Package, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: isRTL ? "المنتجات النشطة" : "Active Products", value: activeProducts, icon: BarChart3, color: "text-green-500", bgColor: "bg-green-500/10" },
    { title: isRTL ? "قيمة المخزون" : "Inventory Value", value: totalValue.toLocaleString("en", { minimumFractionDigits: 2 }), icon: BarChart3, color: "text-primary", bgColor: "bg-primary/10" },
    { title: isRTL ? "تنبيهات نقص" : "Low Stock", value: lowStockCount, icon: AlertTriangle, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  ];

  const productTypeBadge = (type: string) => {
    const map: Record<string, { label: string; labelEn: string; variant: any }> = {
      stock: { label: "مخزني", labelEn: "Stock", variant: "default" },
      service: { label: "خدمة", labelEn: "Service", variant: "secondary" },
      manufacturing: { label: "تصنيع", labelEn: "Manufacturing", variant: "outline" },
      bundle: { label: "حزمة", labelEn: "Bundle", variant: "outline" },
    };
    const info = map[type] || map.stock;
    return <Badge variant={info.variant}>{isRTL ? info.label : info.labelEn}</Badge>;
  };

  const canEdit = can("EDIT_PRODUCT");
  const canDelete = can("DELETE_PRODUCT");
  const canCreate = can("CREATE_PRODUCT");

  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4")}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{isRTL ? "إدارة المنتجات" : "Products Management"}</h1>
          <p className="text-muted-foreground mt-1">{isRTL ? "إدارة المنتجات والخدمات" : "Manage products and services"}</p>
        </div>
        {canCreate && (
          <Button className="gap-2" onClick={() => navigate("/client/inventory/new")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "منتج جديد" : "New Product"}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className={cn(isRTL && "text-right")}>
                  <p className="text-xl font-bold tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-col md:flex-row gap-3", isRTL && "md:flex-row-reverse")}>
            <div className="relative flex-1">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={isRTL ? "بحث بالاسم، SKU، أو الباركود..." : "Search by name, SKU, or barcode..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(isRTL ? "pr-10" : "pl-10")}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={isRTL ? "التصنيف" : "Category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "كل التصنيفات" : "All Categories"}</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{isRTL ? c.name : c.name_en || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder={isRTL ? "النوع" : "Type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "كل الأنواع" : "All Types"}</SelectItem>
                <SelectItem value="stock">{isRTL ? "مخزني" : "Stock"}</SelectItem>
                <SelectItem value="service">{isRTL ? "خدمة" : "Service"}</SelectItem>
                <SelectItem value="manufacturing">{isRTL ? "تصنيع" : "Manufacturing"}</SelectItem>
                <SelectItem value="bundle">{isRTL ? "حزمة" : "Bundle"}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder={isRTL ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                <SelectItem value="active">{isRTL ? "نشط" : "Active"}</SelectItem>
                <SelectItem value="inactive">{isRTL ? "معطل" : "Inactive"}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={isRTL ? "الفرع" : "Branch"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الفروع" : "All Branches"}</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {isRTL ? b.name : b.name_en || b.name}
                    {b.is_main ? (isRTL ? " (رئيسي)" : " (Main)") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                <TableHead>{isRTL ? "SKU" : "SKU"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
                <TableHead className="text-end">{isRTL ? "سعر الشراء" : "Purchase"}</TableHead>
                <TableHead className="text-end">{isRTL ? "سعر البيع" : "Sale"}</TableHead>
                <TableHead className="text-end">{isRTL ? "المخزون" : "Stock"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">
                      {searchTerm || categoryFilter !== "all" || typeFilter !== "all"
                        ? (isRTL ? "لا توجد نتائج مطابقة" : "No matching results")
                        : (isRTL ? "لا توجد منتجات بعد" : "No products yet")}
                    </p>
                    {!searchTerm && categoryFilter === "all" && canCreate && (
                      <Button className="mt-3 gap-2" size="sm" onClick={() => navigate("/client/inventory/new")}>
                        <Plus className="h-4 w-4" />
                        {isRTL ? "إضافة منتج" : "Add Product"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p: any) => {
                  const stock = stockMap[p.id] || 0;
                  const isLow = !p.is_service && p.product_type !== "service" && stock <= (p.reorder_level || p.min_stock || 0) && (p.reorder_level || p.min_stock || 0) > 0;
                  return (
                    <TableRow key={p.id} className={cn(!p.is_active && "opacity-60")}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{isRTL ? p.name : p.name_en || p.name}</p>
                          {p.name_en && isRTL && <p className="text-xs text-muted-foreground">{p.name_en}</p>}
                          {!isRTL && p.name !== (p.name_en || p.name) && <p className="text-xs text-muted-foreground">{p.name}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{p.sku || "-"}</TableCell>
                      <TableCell>{productTypeBadge(p.product_type || (p.is_service ? "service" : "stock"))}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category ? (isRTL ? p.category.name : p.category.name_en || p.category.name) : "-"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{Number(p.purchase_price || 0).toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-end tabular-nums">{Number(p.sale_price || 0).toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {p.is_service || p.product_type === "service" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className={cn(isLow && "text-orange-500 font-semibold")}>
                            {stock}
                            {isLow && <AlertTriangle className="inline h-3.5 w-3.5 ms-1" />}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>
                          {p.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn("flex items-center justify-center gap-1", isRTL && "flex-row-reverse")}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => navigate(`/client/inventory/product/${p.id}`)}
                            title={isRTL ? "عرض" : "View"}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => navigate(`/client/inventory/edit/${p.id}`)}
                              title={isRTL ? "تعديل" : "Edit"}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => toggleActive.mutate({ id: p.id, isActive: p.is_active })}
                              title={isRTL ? "تفعيل/تعطيل" : "Toggle"}
                            >
                              <ToggleLeft className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteDialog({ open: true, id: p.id, name: isRTL ? p.name : p.name_en || p.name })}
                              title={isRTL ? "حذف" : "Delete"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Results count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {isRTL
            ? `عرض ${filtered.length} من ${products.length} منتج`
            : `Showing ${filtered.length} of ${products.length} products`}
        </p>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog({ open: false, id: "", name: "" })}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {isRTL
              ? `هل أنت متأكد من حذف "${deleteDialog.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`
              : `Are you sure you want to delete "${deleteDialog.name}"? This action cannot be undone.`}
          </p>
          <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: "", name: "" })}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteDialog.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? "حذف" : "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientInventory;
