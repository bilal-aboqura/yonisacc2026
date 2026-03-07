import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Pill, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Prescriptions = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("prescriptions")
        .select("*, patients(name, name_en, patient_number), doctors(name, name_en)")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Pill className="h-6 w-6 text-primary" />{isRTL ? "الوصفات الطبية" : "Prescriptions"}</h1>
        <Button onClick={() => navigate("/client/clinic/prescriptions/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "وصفة جديدة" : "New Prescription"}
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "المريض" : "Patient"}</TableHead>
                  <TableHead>{isRTL ? "الطبيب" : "Doctor"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد وصفات" : "No prescriptions"}</TableCell></TableRow>
                ) : prescriptions.map((rx: any, idx: number) => (
                  <TableRow key={rx.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="tabular-nums">{rx.prescription_date}</TableCell>
                    <TableCell>{rx.patients?.patient_number} - {isRTL ? rx.patients?.name : rx.patients?.name_en || rx.patients?.name}</TableCell>
                    <TableCell>{isRTL ? rx.doctors?.name : rx.doctors?.name_en || rx.doctors?.name}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/client/clinic/prescriptions/${rx.id}`)} title={isRTL ? "عرض" : "View"}>
                        <Eye className="h-4 w-4" />
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

export default Prescriptions;
