import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Home, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Units = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["re-units", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("re_units")
        .select("*, re_properties(name, name_en)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("re_units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["re-units"] });
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
              <Home className="h-6 w-6 text-primary" />
              {isRTL ? "الوحدات العقارية" : "Units"}
            </h1>
          </div>
        </div>
        <Button onClick={() => navigate("/client/realestate/units/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة وحدة" : "Add Unit"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "رقم الوحدة" : "Unit #"}</TableHead>
                <TableHead>{isRTL ? "العقار" : "Property"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead className="text-end tabular-nums">{isRTL ? "المساحة" : "Area"}</TableHead>
                <TableHead className="text-end tabular-nums">{isRTL ? "الإيجار الشهري" : "Monthly Rent"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : units.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد وحدات" : "No units"}</TableCell></TableRow>
              ) : (
                units.map((u: any, idx: number) => (
                  <TableRow key={u.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">{u.unit_number}</TableCell>
                    <TableCell>{isRTL ? u.re_properties?.name : (u.re_properties?.name_en || u.re_properties?.name)}</TableCell>
                    <TableCell>{u.unit_type}</TableCell>
                    <TableCell className="text-end tabular-nums">{u.area_sqm ? `${u.area_sqm} m²` : "-"}</TableCell>
                    <TableCell className="text-end tabular-nums">{Number(u.monthly_rent || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "vacant" ? "secondary" : u.status === "occupied" ? "default" : "outline"}>
                        {u.status === "vacant" ? (isRTL ? "شاغرة" : "Vacant") : u.status === "occupied" ? (isRTL ? "مشغولة" : "Occupied") : (isRTL ? "صيانة" : "Maintenance")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/client/realestate/units/${u.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)}>
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

export default Units;
