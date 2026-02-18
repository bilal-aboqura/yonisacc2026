import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Mail, Phone, FileText, Hash,
  MapPin, ArrowLeft, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().min(2, "اسم الشركة مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  phone: z.string().min(9, "رقم الهاتف غير صالح").max(15),
});

interface Props {
  isRTL: boolean;
}

const FieldWrapper = ({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {error && <p className="text-xs text-destructive">⚠ {error}</p>}
  </div>
);

const IconInput = ({ icon: Icon, error, ...props }: React.ComponentProps<typeof Input> & {
  icon: React.ElementType;
  error?: boolean;
}) => (
  <div className="relative">
    <Icon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      {...props}
      className={cn("ps-10", error ? "border-destructive focus-visible:ring-destructive" : "", props.className)}
    />
  </div>
);

export const Step2Company = ({ isRTL }: Props) => {
  const { data, update, goNext, goBack } = useOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    try {
      schema.parse({ company_name: data.company_name, email: data.email, phone: data.phone });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const e: Record<string, string> = {};
        err.errors.forEach((x) => { if (x.path[0]) e[x.path[0] as string] = x.message; });
        setErrors(e);
      }
      return false;
    }
  };

  const upd = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    update({ [key]: e.target.value } as any);
    if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
  };

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-accent/20 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
            <Building2 className="h-7 w-7 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isRTL ? "بيانات الشركة" : "Company Details"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? "أدخل المعلومات الأساسية لشركتك أو مشروعك التجاري"
                : "Enter your company's basic information"}
            </p>
          </div>
        </div>
      </div>

      {/* Section: names */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isRTL ? "اسم الشركة" : "Company Name"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldWrapper label={isRTL ? "بالعربية" : "In Arabic"} required error={errors.company_name}>
            <IconInput
              icon={Building2}
              value={data.company_name}
              onChange={upd("company_name")}
              placeholder={isRTL ? "مثال: شركة النجاح" : "e.g. شركة النجاح"}
              error={!!errors.company_name}
            />
          </FieldWrapper>
          <FieldWrapper label={isRTL ? "بالإنجليزية" : "In English"}>
            <IconInput
              icon={Building2}
              value={data.company_name_en}
              onChange={upd("company_name_en")}
              placeholder="e.g. Success Company"
              dir="ltr"
            />
          </FieldWrapper>
        </div>
      </div>

      {/* Section: contact */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isRTL ? "بيانات التواصل" : "Contact Info"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldWrapper label={isRTL ? "البريد الإلكتروني" : "Email"} required error={errors.email}>
            <IconInput
              icon={Mail}
              type="email"
              value={data.email}
              onChange={upd("email")}
              placeholder="info@company.com"
              dir="ltr"
              error={!!errors.email}
            />
          </FieldWrapper>
          <FieldWrapper label={isRTL ? "رقم الهاتف" : "Phone"} required error={errors.phone}>
            <IconInput
              icon={Phone}
              value={data.phone}
              onChange={upd("phone")}
              placeholder="05xxxxxxxx"
              dir="ltr"
              error={!!errors.phone}
            />
          </FieldWrapper>
        </div>
      </div>

      {/* Section: legal */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isRTL ? "البيانات القانونية (اختياري)" : "Legal Info (Optional)"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldWrapper label={isRTL ? "السجل التجاري" : "Commercial Register"}>
            <IconInput
              icon={FileText}
              value={data.commercial_register}
              onChange={upd("commercial_register")}
              placeholder={isRTL ? "رقم السجل" : "CR Number"}
            />
          </FieldWrapper>
          <FieldWrapper label={isRTL ? "الرقم الضريبي" : "Tax Number"}>
            <IconInput
              icon={Hash}
              value={data.tax_number}
              onChange={upd("tax_number")}
              placeholder={isRTL ? "رقم ضريبي" : "VAT Number"}
            />
          </FieldWrapper>
        </div>
        <FieldWrapper label={isRTL ? "العنوان" : "Address"}>
          <div className="relative">
            <MapPin className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              value={data.address}
              onChange={upd("address")}
              placeholder={isRTL ? "عنوان الشركة الكامل" : "Full company address"}
              rows={2}
              className="ps-10 resize-none"
            />
          </div>
        </FieldWrapper>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goBack} className="gap-2">
          <ArrowRight className={cn("h-4 w-4", !isRTL && "rotate-180")} />
          {isRTL ? "السابق" : "Back"}
        </Button>
        <Button onClick={() => { if (validate()) goNext(); }} size="lg" className="gap-2 min-w-[160px]">
          {isRTL ? "التالي" : "Continue"}
          <ArrowLeft className={cn("h-4 w-4", !isRTL && "rotate-180")} />
        </Button>
      </div>
    </div>
  );
};
