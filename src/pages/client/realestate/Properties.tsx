import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Building2, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Properties = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["re-properties", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("re_properties")
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
      const { error } = await (supabase as any).from("re_properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حذف العقار" : "Property deleted");
      queryClient.invalidateQueries({ queryKey: ["re-properties"] });
    },
    onError: () => toast.error(isRTL ? "خطأ في الحذف" : "Delete error"),
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
              <Building2 className="h-6 w-6 text-primary" />
              {isRTL ? "إدارة العقارات" : "Properties"}
            </h1>
            <p className="text-sm text-muted-foreground">{isRTL ? "إدارة العقارات والمباني" : "Manage your properties"}</p>
          </div>
        </div>
        <Button onClick={() => navigate("/client/realestate/properties/new")}>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة عقار" : "Add Property"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "اسم العقار" : "Property Name"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead>{isRTL ? "العنوان" : "Address"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : properties.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد عقارات" : "No properties found"}</TableCell></TableRow>
              ) : (
                properties.map((p: any, idx: number) => (
                  <TableRow key={p.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">{isRTL ? p.name : (p.name_en || p.name)}</TableCell>
                    <TableCell>{p.property_type}</TableCell>
                    <TableCell>{p.address}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/client/realestate/properties/${p.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
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

export default Properties;
