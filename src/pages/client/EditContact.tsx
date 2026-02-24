import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Save, User, Building2, Phone, Mail, MapPin, FileText, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const EditContact = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const Arrow = isRTL ? ArrowRight : ArrowLeft;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "", name_en: "", type: "customer", email: "", phone: "", mobile: "",
    tax_number: "", commercial_register: "", address: "", city: "", country: "SA",
    credit_limit: 0, notes: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast.error(isRTL ? "لم يتم العثور على الجهة" : "Contact not found");
        navigate(-1);
        return;
      }
      setFormData({
        name: data.name || "", name_en: data.name_en || "", type: data.type || "customer",
        email: data.email || "", phone: data.phone || "", mobile: data.mobile || "",
        tax_number: data.tax_number || "", commercial_register: data.commercial_register || "",
        address: data.address || "", city: data.city || "", country: data.country || "SA",
        credit_limit: data.credit_limit ?? 0, notes: data.notes || "",
      });
      setIsLoading(false);
    };
    load();
  }, [id]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(isRTL ? "الاسم مطلوب" : "Name is required");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("contacts").update({
        name: formData.name.trim(),
        name_en: formData.name_en?.trim() || null,
        type: formData.type,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        mobile: formData.mobile?.trim() || null,
        tax_number: formData.tax_number?.trim() || null,
        commercial_register: formData.commercial_register?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        country: formData.country || "SA",
        credit_limit: formData.credit_limit || 0,
        notes: formData.notes?.trim() || null,
      }).eq("id", id!);
      if (error) throw error;
      toast.success(isRTL ? "تم تحديث البيانات بنجاح" : "Contact updated successfully");
      navigate(-1);
    } catch (error: any) {
      toast.error(error.message || (isRTL ? "خطأ في الحفظ" : "Error saving"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const typeLabel = formData.type === "customer" ? (isRTL ? "تعديل بيانات العميل" : "Edit Customer")
    : formData.type === "vendor" ? (isRTL ? "تعديل بيانات المورد" : "Edit Vendor")
    : (isRTL ? "تعديل بيانات الجهة" : "Edit Contact");

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <Arrow className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{typeLabel}</h1>
        </div>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {isRTL ? "حفظ التعديلات" : "Save Changes"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                {isRTL ? "المعلومات الأساسية" : "Basic Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "نوع الجهة" : "Contact Type"}</Label>
                  <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">{isRTL ? "عميل" : "Customer"}</SelectItem>
                      <SelectItem value="vendor">{isRTL ? "مورد" : "Vendor"}</SelectItem>
                      <SelectItem value="both">{isRTL ? "عميل ومورد" : "Both"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"} *</Label>
                  <Input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                  <Input value={formData.name_en} onChange={(e) => handleChange("name_en", e.target.value)} dir="ltr" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {isRTL ? "المعلومات الضريبية والتجارية" : "Tax & Commercial Info"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الرقم الضريبي" : "VAT Number"}</Label>
                  <Input value={formData.tax_number} onChange={(e) => handleChange("tax_number", e.target.value)} dir="ltr" maxLength={15} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "السجل التجاري" : "Commercial Register"}</Label>
                  <Input value={formData.commercial_register} onChange={(e) => handleChange("commercial_register", e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "حد الائتمان" : "Credit Limit"}</Label>
                <Input type="number" min="0" value={formData.credit_limit} onChange={(e) => handleChange("credit_limit", parseFloat(e.target.value) || 0)} dir="ltr" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {isRTL ? "معلومات الاتصال" : "Contact Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الهاتف" : "Phone"}</Label>
                  <Input value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الجوال" : "Mobile"}</Label>
                <Input value={formData.mobile} onChange={(e) => handleChange("mobile", e.target.value)} dir="ltr" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {isRTL ? "العنوان" : "Address"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "المدينة" : "City"}</Label>
                  <Input value={formData.city} onChange={(e) => handleChange("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الدولة" : "Country"}</Label>
                  <Select value={formData.country} onValueChange={(v) => handleChange("country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SA">{isRTL ? "السعودية" : "Saudi Arabia"}</SelectItem>
                      <SelectItem value="AE">{isRTL ? "الإمارات" : "UAE"}</SelectItem>
                      <SelectItem value="KW">{isRTL ? "الكويت" : "Kuwait"}</SelectItem>
                      <SelectItem value="BH">{isRTL ? "البحرين" : "Bahrain"}</SelectItem>
                      <SelectItem value="QA">{isRTL ? "قطر" : "Qatar"}</SelectItem>
                      <SelectItem value="OM">{isRTL ? "عمان" : "Oman"}</SelectItem>
                      <SelectItem value="EG">{isRTL ? "مصر" : "Egypt"}</SelectItem>
                      <SelectItem value="JO">{isRTL ? "الأردن" : "Jordan"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "العنوان التفصيلي" : "Full Address"}</Label>
                <Textarea value={formData.address} onChange={(e) => handleChange("address", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "ملاحظات" : "Notes"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} rows={3} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "ملخص" : "Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {formData.type === "vendor" ? <Building2 className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <p className="font-medium">{formData.name || (isRTL ? "اسم الجهة" : "Contact name")}</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.type === "customer" ? (isRTL ? "عميل" : "Customer") : formData.type === "vendor" ? (isRTL ? "مورد" : "Vendor") : (isRTL ? "عميل ومورد" : "Both")}
                    </p>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                {isRTL ? "حفظ التعديلات" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditContact;
