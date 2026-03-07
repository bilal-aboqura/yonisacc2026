import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Stethoscope, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Doctors = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("doctors").select("*").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          {isRTL ? "الأطباء" : "Doctors"}
        </h1>
        <Button onClick={() => navigate("/client/clinic/doctors/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة طبيب" : "Add Doctor"}
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "التخصص" : "Specialization"}</TableHead>
                  <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
                  <TableHead>{isRTL ? "الترخيص" : "License"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد أطباء" : "No doctors"}</TableCell></TableRow>
                ) : doctors.map((d: any, idx: number) => (
                  <TableRow key={d.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">{isRTL ? d.name : d.name_en || d.name}</TableCell>
                    <TableCell>{isRTL ? d.specialization : d.specialization_en || d.specialization || "-"}</TableCell>
                    <TableCell>{d.phone || "-"}</TableCell>
                    <TableCell>{d.license_number || "-"}</TableCell>
                    <TableCell><Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}</Badge></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/client/clinic/doctors/${d.id}/edit`)} title={isRTL ? "تعديل" : "Edit"}>
                        <Edit className="h-4 w-4" />
                      </Button>
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

export default Doctors;
