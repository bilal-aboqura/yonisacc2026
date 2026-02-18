import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isRTL: boolean;
}

export const Step1Account = ({ isRTL }: Props) => {
  const { data, update, goNext } = useOnboarding();
  const { user } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.full_name.trim() || data.full_name.trim().length < 2) {
      newErrors.full_name = isRTL ? "الاسم مطلوب (حرفان على الأقل)" : "Name is required (min 2 chars)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <User className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isRTL ? "معلومات حسابك" : "Your Account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? "أخبرنا من أنت حتى نتمكن من تخصيص تجربتك"
                : "Tell us who you are so we can personalize your experience"}
            </p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {/* Email (readonly) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {isRTL ? "البريد الإلكتروني" : "Email Address"}
          </Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={user?.email ?? ""}
              disabled
              dir="ltr"
              className="ps-10 bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            {isRTL ? "تم التحقق من هذا البريد الإلكتروني" : "This email is verified"}
          </div>
        </div>

        {/* Full name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-medium text-foreground">
            {isRTL ? "الاسم الكامل" : "Full Name"} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="full_name"
              value={data.full_name}
              onChange={(e) => {
                update({ full_name: e.target.value });
                if (errors.full_name) setErrors((p) => ({ ...p, full_name: "" }));
              }}
              placeholder={isRTL ? "مثال: أحمد محمد" : "e.g. John Smith"}
              className={cn("ps-10", errors.full_name ? "border-destructive focus-visible:ring-destructive" : "")}
            />
          </div>
          {errors.full_name && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>⚠</span> {errors.full_name}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex ${isRTL ? "justify-end" : "justify-end"} pt-2`}>
        <Button onClick={() => { if (validate()) goNext(); }} size="lg" className="gap-2 min-w-[160px]">
          {isRTL ? "التالي" : "Continue"}
          <ArrowLeft className={isRTL ? "h-4 w-4" : "h-4 w-4 rotate-180"} />
        </Button>
      </div>
    </div>
  );
};
