import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Edit, Loader2, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const ViewPatient = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("patients").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!patient) return <div className="text-center py-16 text-muted-foreground">{isRTL ? "المريض غير موجود" : "Patient not found"}</div>;

  const Field = ({ label, value, danger }: { label: string; value: string; danger?: boolean }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${danger ? "text-destructive" : ""}`}>{value || "-"}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/clinic/patients")}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {isRTL ? "بيانات المريض" : "Patient Details"}
          </h1>
          <Badge variant={patient.is_active ? "default" : "secondary"}>
            {patient.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
          </Badge>
        </div>
        <Button variant="outline" onClick={() => navigate(`/client/clinic/patients/${id}/edit`)}>
          <Edit className="h-4 w-4 me-2" />{isRTL ? "تعديل" : "Edit"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "البيانات الأساسية" : "Basic Info"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label={isRTL ? "رقم المريض" : "Patient #"} value={patient.patient_number} />
            <Field label={isRTL ? "الاسم" : "Name"} value={patient.name} />
            <Field label={isRTL ? "الاسم بالإنجليزية" : "Name (EN)"} value={patient.name_en} />
            <Field label={isRTL ? "تاريخ الميلاد" : "Date of Birth"} value={patient.date_of_birth} />
            <Field label={isRTL ? "الجنس" : "Gender"} value={patient.gender === "male" ? (isRTL ? "ذكر" : "Male") : (isRTL ? "أنثى" : "Female")} />
            <Field label={isRTL ? "فصيلة الدم" : "Blood Type"} value={patient.blood_type} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "معلومات الاتصال" : "Contact Info"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label={isRTL ? "الهاتف" : "Phone"} value={patient.phone} />
            <Field label={isRTL ? "الجوال" : "Mobile"} value={patient.mobile} />
            <Field label={isRTL ? "البريد" : "Email"} value={patient.email} />
            <Field label={isRTL ? "العنوان" : "Address"} value={patient.address} />
            <Field label={isRTL ? "جهة الطوارئ" : "Emergency Contact"} value={patient.emergency_contact_name} />
            <Field label={isRTL ? "هاتف الطوارئ" : "Emergency Phone"} value={patient.emergency_contact_phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "التأمين" : "Insurance"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label={isRTL ? "شركة التأمين" : "Provider"} value={patient.insurance_provider} />
            <Field label={isRTL ? "رقم التأمين" : "Insurance #"} value={patient.insurance_number} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? "السجل الطبي" : "Medical History"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label={isRTL ? "الحساسية" : "Allergies"} value={patient.allergies} danger={!!patient.allergies} />
            <Field label={isRTL ? "الأمراض المزمنة" : "Chronic Conditions"} value={patient.chronic_conditions} />
            <Field label={isRTL ? "ملاحظات" : "Notes"} value={patient.notes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewPatient;
