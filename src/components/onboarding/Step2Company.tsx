import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().min(2, "اسم الشركة مطلوب").max(100),
  company_name_en: z.string().max(100).optional(),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  phone: z.string().min(9, "رقم الهاتف غير صالح").max(15),
  commercial_register: z.string().max(50).optional(),
  tax_number: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

interface Props {
  isRTL: boolean;
}

export const Step2Company = ({ isRTL }: Props) => {
  const { data, update, goNext, goBack } = useOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    try {
      schema.parse({
        company_name: data.company_name,
        company_name_en: data.company_name_en,
        email: data.email,
        phone: data.phone,
        commercial_register: data.commercial_register,
        tax_number: data.tax_number,
        address: data.address,
      });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const field = (key: keyof typeof data) => ({
    value: data[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      update({ [key]: e.target.value } as any);
      if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {isRTL ? "بيانات الشركة" : "Company Details"}
        </CardTitle>
        <CardDescription>
          {isRTL ? "أدخل المعلومات الأساسية لشركتك" : "Enter your company's basic information"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">{isRTL ? "اسم الشركة (عربي) *" : "Company Name (Arabic) *"}</Label>
            <Input
              id="company_name"
              {...field("company_name")}
              placeholder={isRTL ? "مثال: شركة النجاح" : "e.g. Success Co."}
              className={errors.company_name ? "border-destructive" : ""}
            />
            {errors.company_name && <p className="text-sm text-destructive">{errors.company_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name_en">{isRTL ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}</Label>
            <Input
              id="company_name_en"
              {...field("company_name_en")}
              placeholder="Success Company"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">{isRTL ? "البريد الإلكتروني *" : "Email *"}</Label>
            <Input
              id="email"
              type="email"
              {...field("email")}
              placeholder="info@company.com"
              dir="ltr"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{isRTL ? "رقم الهاتف *" : "Phone *"}</Label>
            <Input
              id="phone"
              {...field("phone")}
              placeholder="05xxxxxxxx"
              dir="ltr"
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="commercial_register">{isRTL ? "السجل التجاري" : "Commercial Register"}</Label>
            <Input id="commercial_register" {...field("commercial_register")} placeholder={isRTL ? "رقم السجل التجاري" : "CR Number"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax_number">{isRTL ? "الرقم الضريبي" : "Tax Number"}</Label>
            <Input id="tax_number" {...field("tax_number")} placeholder={isRTL ? "رقم التسجيل الضريبي" : "VAT Number"} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{isRTL ? "العنوان" : "Address"}</Label>
          <Textarea
            id="address"
            value={data.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder={isRTL ? "عنوان الشركة الكامل" : "Full company address"}
            rows={3}
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={goBack}>{isRTL ? "السابق" : "Back"}</Button>
          <Button onClick={() => { if (validate()) goNext(); }} size="lg">
            {isRTL ? "التالي: التفضيلات" : "Next: Preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
