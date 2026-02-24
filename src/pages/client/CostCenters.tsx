import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Target, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, StatusBadge } from "@/components/ui/data-table";

const CostCenters = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useTenantIsolation();

  const { data: costCenters = [], isLoading, refetch } = useQuery({
    queryKey: ["cost-centers", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, code, name, name_en, parent_id, is_active, created_at")
        .eq("company_id", companyId)
        .order("code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("cost_centers").delete().eq("id", id);
    if (error) {
      toast.error(isRTL ? "لا يمكن حذف مركز التكلفة" : "Cannot delete cost center");
    } else {
      toast.success(isRTL ? "تم الحذف بنجاح" : "Deleted successfully");
      refetch();
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = costCenters.find((cc) => cc.id === parentId);
    return parent ? (isRTL ? parent.name : parent.name_en || parent.name) : "-";
  };

  return (
    <div className="space-y-6">
      <DataTable
        title={isRTL ? "مراكز التكلفة" : "Cost Centers"}
        icon={<Target className="h-5 w-5" />}
        columns={[
          { key: "code", header: isRTL ? "الرمز" : "Code", render: (cc: any) => <span className="font-mono">{cc.code}</span> },
          { key: "name", header: isRTL ? "الاسم" : "Name" },
          { key: "name_en", header: isRTL ? "الاسم (إنجليزي)" : "Name (EN)", render: (cc: any) => cc.name_en || "-", hideOnMobile: true },
          { key: "parent", header: isRTL ? "الأب" : "Parent", render: (cc: any) => getParentName(cc.parent_id), hideOnMobile: true },
          { key: "status", header: isRTL ? "الحالة" : "Status", render: (cc: any) => (
            <StatusBadge config={{ label: cc.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive"), variant: cc.is_active ? "success" : "secondary" }} />
          )},
        ]}
        data={costCenters}
        isLoading={isLoading}
        rowKey={(cc: any) => cc.id}
        actions={[
          { label: isRTL ? "تعديل" : "Edit", icon: <Pencil className="h-4 w-4" />, onClick: (cc: any) => navigate(`/client/cost-centers/${cc.id}/edit`) },
          { label: isRTL ? "حذف" : "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: (cc: any) => handleDelete(cc.id), variant: "destructive" as const, separator: true },
        ]}
        searchPlaceholder={isRTL ? "بحث في مراكز التكلفة..." : "Search cost centers..."}
        onSearch={(cc: any, term: string) => cc.code.toLowerCase().includes(term) || cc.name.toLowerCase().includes(term) || (cc.name_en || "").toLowerCase().includes(term)}
        createButton={{ label: isRTL ? "إضافة مركز تكلفة" : "Add Cost Center", onClick: () => navigate("/client/cost-centers/new") }}
        emptyState={{ icon: <Target className="h-10 w-10 text-muted-foreground/60" />, title: isRTL ? "لا توجد مراكز تكلفة" : "No cost centers yet", actionLabel: isRTL ? "إضافة" : "Add", onAction: () => navigate("/client/cost-centers/new") }}
      />
    </div>
  );
};

export default CostCenters;