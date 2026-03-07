import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Building2, Truck, Wrench, Armchair, Edit, Trash2, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  disposed: "bg-red-500/10 text-red-600 border-red-200",
  under_maintenance: "bg-amber-500/10 text-amber-600 border-amber-200",
  inactive: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  active: { ar: "نشط", en: "Active" },
  disposed: { ar: "تم التخلص", en: "Disposed" },
  under_maintenance: { ar: "تحت الصيانة", en: "Under Maintenance" },
  inactive: { ar: "غير نشط", en: "Inactive" },
};

const methodLabels: Record<string, { ar: string; en: string }> = {
  straight_line: { ar: "القسط الثابت", en: "Straight Line" },
  declining_balance: { ar: "القسط المتناقص", en: "Declining Balance" },
  units_of_production: { ar: "وحدات الإنتاج", en: "Units of Production" },
};

const FixedAssets = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["fixed-assets", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from("fixed_assets")
        .select("*, category:category_id(name, name_en), branch:branch_id(name, name_en)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("fixed_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast({ title: isRTL ? "تم حذف الأصل" : "Asset deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = assets?.filter((a: any) =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.asset_code?.toLowerCase().includes(search.toLowerCase()) ||
    a.barcode?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Summary stats
  const totalCost = filtered.reduce((s: number, a: any) => s + (a.purchase_cost || 0), 0);
  const activeCount = filtered.filter((a: any) => a.status === "active").length;
  const maintenanceCount = filtered.filter((a: any) => a.status === "under_maintenance").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? "إجمالي الأصول" : "Total Assets", value: filtered.length, icon: Building2, color: "text-primary" },
          { label: isRTL ? "أصول نشطة" : "Active Assets", value: activeCount, icon: Building2, color: "text-emerald-600" },
          { label: isRTL ? "تحت الصيانة" : "Under Maintenance", value: maintenanceCount, icon: Wrench, color: "text-amber-600" },
          { label: isRTL ? "إجمالي التكلفة" : "Total Cost", value: totalCost.toLocaleString(), icon: Building2, color: "text-primary" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{isRTL ? "الأصول الثابتة" : "Fixed Assets"}</CardTitle>
          <Button onClick={() => navigate("/client/assets/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            {isRTL ? "إضافة أصل" : "Add Asset"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${isRTL ? "right-3" : "left-3"}`} />
              <Input
                placeholder={isRTL ? "بحث بالاسم أو الكود أو الباركود..." : "Search by name, code, or barcode..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الكود" : "Code"}</TableHead>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
                <TableHead>{isRTL ? "تكلفة الشراء" : "Purchase Cost"}</TableHead>
                <TableHead>{isRTL ? "طريقة الإهلاك" : "Depreciation"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "جاري التحميل..." : "Loading..."}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد أصول" : "No assets found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((asset: any) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono text-sm">{asset.asset_code}</TableCell>
                    <TableCell className="font-medium">{isRTL ? asset.name : (asset.name_en || asset.name)}</TableCell>
                    <TableCell>{asset.category ? (isRTL ? asset.category.name : (asset.category.name_en || asset.category.name)) : "—"}</TableCell>
                    <TableCell>{asset.purchase_cost?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {methodLabels[asset.depreciation_method]?.[isRTL ? "ar" : "en"] || asset.depreciation_method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[asset.status] || ""}>
                        {statusLabels[asset.status]?.[isRTL ? "ar" : "en"] || asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "start" : "end"}>
                          <DropdownMenuItem onClick={() => navigate(`/client/assets/${asset.id}`)} className="gap-2">
                            <Eye className="h-4 w-4" />
                            {isRTL ? "عرض" : "View"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/client/assets/${asset.id}/edit`)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            {isRTL ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(asset.id)} className="gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            {isRTL ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? "هل أنت متأكد من حذف هذا الأصل؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this asset? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FixedAssets;
