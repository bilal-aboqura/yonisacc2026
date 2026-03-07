import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Appointments = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("appointments")
        .select("*, patients(name, name_en, patient_number), doctors(name, name_en)")
        .eq("company_id", companyId)
        .order("appointment_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    toast.success(isRTL ? "تم التحديث" : "Updated");
  };

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      scheduled: ["مجدول", "Scheduled"], confirmed: ["مؤكد", "Confirmed"],
      completed: ["مكتمل", "Completed"], cancelled: ["ملغي", "Cancelled"], "no-show": ["لم يحضر", "No Show"],
    };
    return isRTL ? map[s]?.[0] || s : map[s]?.[1] || s;
  };

  const STATUS_COLORS: Record<string, any> = {
    scheduled: "default", confirmed: "default", completed: "secondary", cancelled: "destructive", "no-show": "outline",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          {isRTL ? "المواعيد" : "Appointments"}
        </h1>
        <Button onClick={() => navigate("/client/clinic/appointments/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "حجز موعد" : "Book Appointment"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "الوقت" : "Time"}</TableHead>
                  <TableHead>{isRTL ? "المريض" : "Patient"}</TableHead>
                  <TableHead>{isRTL ? "الطبيب" : "Doctor"}</TableHead>
                  <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "تغيير الحالة" : "Change Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد مواعيد" : "No appointments"}</TableCell></TableRow>
                ) : appointments.map((a: any, idx: number) => (
                  <TableRow key={a.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="tabular-nums">{a.appointment_date}</TableCell>
                    <TableCell className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.appointment_time?.slice(0, 5)}</TableCell>
                    <TableCell>{a.patients?.patient_number} - {isRTL ? a.patients?.name : a.patients?.name_en || a.patients?.name}</TableCell>
                    <TableCell>{isRTL ? a.doctors?.name : a.doctors?.name_en || a.doctors?.name}</TableCell>
                    <TableCell>{a.visit_type}</TableCell>
                    <TableCell><Badge variant={STATUS_COLORS[a.status] || "default"}>{statusLabel(a.status)}</Badge></TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={v => updateStatus(a.id, v)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["scheduled","confirmed","completed","cancelled","no-show"].map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                        </SelectContent>
                      </Select>
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

export default Appointments;
