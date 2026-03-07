import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Loader2, Pill } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const ViewPrescription = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: rx, isLoading } = useQuery({
    queryKey: ["prescription", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("prescriptions")
        .select("*, patients(name, name_en, patient_number), doctors(name, name_en)")
        .eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["prescription-items", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("prescription_items").select("*").eq("prescription_id", id);
      return data || [];
    },
    enabled: !!id,
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!rx) return <div className="text-center py-16 text-muted-foreground">{isRTL ? "غير موجود" : "Not found"}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/prescriptions")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Pill className="h-6 w-6 text-primary" />
          {isRTL ? "تفاصيل الوصفة" : "Prescription Details"}
        </h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{isRTL ? "معلومات عامة" : "General Info"}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><p className="text-xs text-muted-foreground">{isRTL ? "المريض" : "Patient"}</p><p className="font-medium">{rx.patients?.patient_number} - {isRTL ? rx.patients?.name : rx.patients?.name_en || rx.patients?.name}</p></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? "الطبيب" : "Doctor"}</p><p className="font-medium">{isRTL ? rx.doctors?.name : rx.doctors?.name_en || rx.doctors?.name}</p></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</p><p className="font-medium tabular-nums">{rx.prescription_date}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{isRTL ? "الأدوية" : "Medicines"}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الدواء" : "Medicine"}</TableHead>
                <TableHead>{isRTL ? "الجرعة" : "Dosage"}</TableHead>
                <TableHead>{isRTL ? "التكرار" : "Frequency"}</TableHead>
                <TableHead>{isRTL ? "المدة" : "Duration"}</TableHead>
                <TableHead>{isRTL ? "التعليمات" : "Instructions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.medicine_name}</TableCell>
                  <TableCell>{item.dosage || "-"}</TableCell>
                  <TableCell>{item.frequency || "-"}</TableCell>
                  <TableCell>{item.duration || "-"}</TableCell>
                  <TableCell>{item.instructions || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {rx.notes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">{isRTL ? "ملاحظات" : "Notes"}</p>
            <p>{rx.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ViewPrescription;
