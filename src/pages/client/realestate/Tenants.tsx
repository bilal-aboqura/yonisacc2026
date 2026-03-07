import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Users, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Tenants = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["re-tenants", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("re_tenants")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("re_tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["re-tenants"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client")}>
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {isRTL ? "المستأجرين" : "Tenants"}
            </h1>
          </div>
        </div>
        <Button onClick={() => navigate("/client/realestate/tenants/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة مستأجر" : "Add Tenant"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
                <TableHead>{isRTL ? "البريد" : "Email"}</TableHead>
                <TableHead>{isRTL ? "الهوية" : "ID Number"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : tenants.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد مستأجرين" : "No tenants"}</TableCell></TableRow>
              ) : (
                tenants.map((t: any, idx: number) => (
                  <TableRow key={t.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">{isRTL ? t.name : (t.name_en || t.name)}</TableCell>
                    <TableCell className="tabular-nums">{t.phone || "-"}</TableCell>
                    <TableCell>{t.email || "-"}</TableCell>
                    <TableCell className="tabular-nums">{t.id_number || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/client/realestate/tenants/${t.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tenants;
