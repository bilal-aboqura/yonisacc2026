import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Users, Stethoscope, DollarSign, Loader2, Activity } from "lucide-react";

const ClinicReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["clinic-stats", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const [patientsRes, appointmentsRes, invoicesRes, doctorsRes] = await Promise.all([
        (supabase as any).from("patients").select("id", { count: "exact" }).eq("company_id", companyId),
        (supabase as any).from("appointments").select("id, status, doctor_id, doctors(name, name_en)", { count: "exact" }).eq("company_id", companyId),
        (supabase as any).from("clinic_invoices").select("*").eq("company_id", companyId),
        (supabase as any).from("doctors").select("id, name, name_en").eq("company_id", companyId).eq("is_active", true),
      ]);

      let filteredInvoices = invoicesRes.data || [];
      let filteredAppointments = appointmentsRes.data || [];
      if (dateFrom) {
        filteredInvoices = filteredInvoices.filter((i: any) => i.invoice_date >= dateFrom);
        filteredAppointments = filteredAppointments.filter((a: any) => a.appointment_date >= dateFrom);
      }
      if (dateTo) {
        filteredInvoices = filteredInvoices.filter((i: any) => i.invoice_date <= dateTo);
        filteredAppointments = filteredAppointments.filter((a: any) => a.appointment_date <= dateTo);
      }

      const totalRevenue = filteredInvoices.reduce((s: number, i: any) => s + parseFloat(i.total_amount || 0), 0);
      const totalPaid = filteredInvoices.reduce((s: number, i: any) => s + parseFloat(i.paid_amount || 0), 0);
      const totalInsurance = filteredInvoices.reduce((s: number, i: any) => s + parseFloat(i.insurance_amount || 0), 0);

      // Doctor activity
      const doctorActivity = (doctorsRes.data || []).map((d: any) => {
        const appts = filteredAppointments.filter((a: any) => a.doctor_id === d.id);
        const completed = appts.filter((a: any) => a.status === "completed").length;
        return { ...d, total: appts.length, completed };
      });

      // Status breakdown
      const statusCounts: Record<string, number> = {};
      filteredAppointments.forEach((a: any) => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

      return {
        totalPatients: patientsRes.count || 0,
        totalAppointments: filteredAppointments.length,
        totalRevenue, totalPaid, totalInsurance,
        unpaidAmount: totalRevenue - totalPaid,
        invoiceCount: filteredInvoices.length,
        doctorActivity, statusCounts,
      };
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />{isRTL ? "تقارير العيادة" : "Clinic Reports"}</h1>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1"><Label>{isRTL ? "من" : "From"}</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
        <div className="space-y-1"><Label>{isRTL ? "إلى" : "To"}</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: isRTL ? "إجمالي المرضى" : "Total Patients", value: stats.totalPatients, color: "text-blue-500" },
              { icon: Activity, label: isRTL ? "المواعيد" : "Appointments", value: stats.totalAppointments, color: "text-green-500" },
              { icon: DollarSign, label: isRTL ? "إجمالي الإيرادات" : "Total Revenue", value: stats.totalRevenue.toFixed(2), color: "text-primary" },
              { icon: DollarSign, label: isRTL ? "المبالغ المحصلة" : "Collected", value: stats.totalPaid.toFixed(2), color: "text-emerald-500" },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <s.icon className={`h-8 w-8 ${s.color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="doctors">
            <TabsList>
              <TabsTrigger value="doctors"><Stethoscope className="h-4 w-4 me-1" />{isRTL ? "نشاط الأطباء" : "Doctor Activity"}</TabsTrigger>
              <TabsTrigger value="revenue"><DollarSign className="h-4 w-4 me-1" />{isRTL ? "الإيرادات" : "Revenue"}</TabsTrigger>
              <TabsTrigger value="patients"><Users className="h-4 w-4 me-1" />{isRTL ? "إحصائيات المرضى" : "Patient Stats"}</TabsTrigger>
            </TabsList>

            <TabsContent value="doctors">
              <Card>
                <CardHeader><CardTitle>{isRTL ? "نشاط الأطباء" : "Doctor Activity"}</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{isRTL ? "الطبيب" : "Doctor"}</TableHead>
                      <TableHead>{isRTL ? "إجمالي المواعيد" : "Total Appointments"}</TableHead>
                      <TableHead>{isRTL ? "المكتملة" : "Completed"}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {stats.doctorActivity.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{isRTL ? d.name : d.name_en || d.name}</TableCell>
                          <TableCell>{d.total}</TableCell>
                          <TableCell>{d.completed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue">
              <Card>
                <CardHeader><CardTitle>{isRTL ? "ملخص الإيرادات" : "Revenue Summary"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      [isRTL ? "عدد الفواتير" : "Invoice Count", stats.invoiceCount],
                      [isRTL ? "إجمالي الإيرادات" : "Total Revenue", stats.totalRevenue.toFixed(2)],
                      [isRTL ? "مبالغ التأمين" : "Insurance", stats.totalInsurance.toFixed(2)],
                      [isRTL ? "المتأخرات" : "Outstanding", stats.unpaidAmount.toFixed(2)],
                    ].map(([label, val], i) => (
                      <div key={i} className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold">{val}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patients">
              <Card>
                <CardHeader><CardTitle>{isRTL ? "حالة المواعيد" : "Appointment Status"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(stats.statusCounts).map(([status, count]) => (
                      <div key={status} className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground capitalize">{status}</p>
                        <p className="text-2xl font-bold">{count as number}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ClinicReports;
