import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "مراكز التكلفة" : "Cost Centers"}
        </h1>
        <Button onClick={() => navigate("/client/cost-centers/new")}>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة مركز تكلفة" : "Add Cost Center"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isRTL ? "مراكز التكلفة" : "Cost Centers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              {isRTL ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : costCenters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {isRTL ? "لا توجد مراكز تكلفة حالياً" : "No cost centers yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الرمز" : "Code"}</TableHead>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "الاسم (إنجليزي)" : "Name (EN)"}</TableHead>
                  <TableHead>{isRTL ? "الأب" : "Parent"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCenters.map((cc) => (
                  <TableRow key={cc.id}>
                    <TableCell className="font-mono">{cc.code}</TableCell>
                    <TableCell>{cc.name}</TableCell>
                    <TableCell>{cc.name_en || "-"}</TableCell>
                    <TableCell>{getParentName(cc.parent_id)}</TableCell>
                    <TableCell>
                      <Badge variant={cc.is_active ? "default" : "secondary"}>
                        {cc.is_active
                          ? (isRTL ? "نشط" : "Active")
                          : (isRTL ? "غير نشط" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/client/cost-centers/${cc.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostCenters;
