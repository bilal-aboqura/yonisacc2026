import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Save, User, Building2, Phone, Mail, MapPin, FileText, Loader2 } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب").max(100),
  name_en: z.string().max(100).optional(),
  type: z.enum(["customer", "vendor", "both"]),
  email: z.string().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  tax_number: z.string().max(15).optional(),
  commercial_register: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  credit_limit: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

const CreateContact = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const Arrow = isRTL ? ArrowRight : ArrowLeft;

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    name_en: "",
    type: "customer",
    email: "",
    phone: "",
    mobile: "",
    tax_number: "",
    commercial_register: "",
    address: "",
    city: "",
    country: "SA",
    credit_limit: 0,
    notes: "",
  });

  const handleChange = (field: keyof ContactFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async () => {
    // Validate
    try {
      contactSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error(isRTL ? "يرجى تصحيح الأخطاء" : "Please fix the errors");
        return;
      }
    }

    if (!user) {
      toast.error(isRTL ? "يرجى تسجيل الدخول" : "Please login");
      return;
    }

    setIsSaving(true);

    try {
      const companyId = await fetchCompanyId(user.id);

      if (!companyId) {
        toast.error(isRTL ? "لم يتم العثور على الشركة" : "Company not found");
        return;
      }

      // Create contact
      const { error } = await supabase.from("contacts").insert({
        company_id: companyId,
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
      });

      if (error) throw error;

      toast.success(
        formData.type === "customer"
          ? (isRTL ? "تم إضافة العميل بنجاح" : "Customer added successfully")
          : formData.type === "vendor"
          ? (isRTL ? "تم إضافة المورد بنجاح" : "Vendor added successfully")
          : (isRTL ? "تم إضافة الجهة بنجاح" : "Contact added successfully")
      );

      navigate("/client/contacts");
    } catch (error: any) {
      console.error("Error creating contact:", error);
      toast.error(error.message || (isRTL ? "خطأ في الحفظ" : "Error saving"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/contacts")}>
            <Arrow className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {formData.type === "customer"
                ? (isRTL ? "إضافة عميل جديد" : "Add New Customer")
                : formData.type === "vendor"
                ? (isRTL ? "إضافة مورد جديد" : "Add New Vendor")
                : (isRTL ? "إضافة جهة جديدة" : "Add New Contact")}
            </h1>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 me-2" />
          )}
          {isRTL ? "حفظ" : "Save"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
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
                  <Label>{isRTL ? "نوع الجهة" : "Contact Type"} *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder={isRTL ? "اسم العميل بالعربي" : "Customer name in Arabic"}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                  <Input
                    value={formData.name_en}
                    onChange={(e) => handleChange("name_en", e.target.value)}
                    placeholder="Customer name in English"
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax & Commercial Info */}
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
                  <Input
                    value={formData.tax_number}
                    onChange={(e) => handleChange("tax_number", e.target.value)}
                    placeholder="3XXXXXXXXXX00003"
                    dir="ltr"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "رقم التسجيل في ضريبة القيمة المضافة (15 رقم)" : "VAT registration number (15 digits)"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "السجل التجاري" : "Commercial Register"}</Label>
                  <Input
                    value={formData.commercial_register}
                    onChange={(e) => handleChange("commercial_register", e.target.value)}
                    placeholder="1010XXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "حد الائتمان" : "Credit Limit"}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={formData.credit_limit}
                    onChange={(e) => handleChange("credit_limit", parseFloat(e.target.value) || 0)}
                    className="pe-12"
                    dir="ltr"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ر.س
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
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
                  <Label className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {isRTL ? "البريد الإلكتروني" : "Email"}
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="email@example.com"
                    dir="ltr"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الهاتف" : "Phone"}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+966 XX XXX XXXX"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "الجوال" : "Mobile"}</Label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => handleChange("mobile", e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
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
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder={isRTL ? "الرياض" : "Riyadh"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الدولة" : "Country"}</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => handleChange("country", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder={isRTL ? "الحي، الشارع، رقم المبنى..." : "District, Street, Building number..."}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "ملاحظات" : "Notes"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder={isRTL ? "ملاحظات إضافية..." : "Additional notes..."}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "ملخص" : "Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {formData.type === "vendor" ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {formData.name || (isRTL ? "اسم الجهة" : "Contact name")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.type === "customer"
                        ? (isRTL ? "عميل" : "Customer")
                        : formData.type === "vendor"
                        ? (isRTL ? "مورد" : "Vendor")
                        : (isRTL ? "عميل ومورد" : "Both")}
                    </p>
                  </div>
                </div>

                {formData.tax_number && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{isRTL ? "الرقم الضريبي:" : "VAT:"} </span>
                    <span className="font-mono">{formData.tax_number}</span>
                  </div>
                )}

                {formData.phone && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{isRTL ? "الهاتف:" : "Phone:"} </span>
                    <span dir="ltr">{formData.phone}</span>
                  </div>
                )}

                {formData.city && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{isRTL ? "المدينة:" : "City:"} </span>
                    <span>{formData.city}</span>
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 me-2" />
                )}
                {isRTL ? "حفظ الجهة" : "Save Contact"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateContact;
