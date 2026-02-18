import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User } from "lucide-react";

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

  const handleNext = () => {
    if (validate()) goNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {isRTL ? "معلومات الحساب" : "Account Information"}
        </CardTitle>
        <CardDescription>
          {isRTL ? "تأكيد بيانات حسابك الشخصي" : "Confirm your personal account details"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
          <Input value={user?.email ?? ""} disabled dir="ltr" className="bg-muted/50" />
          <p className="text-xs text-muted-foreground">
            {isRTL ? "البريد الإلكتروني لا يمكن تغييره" : "Email cannot be changed"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">
            {isRTL ? "الاسم الكامل *" : "Full Name *"}
          </Label>
          <Input
            id="full_name"
            value={data.full_name}
            onChange={(e) => {
              update({ full_name: e.target.value });
              if (errors.full_name) setErrors((p) => ({ ...p, full_name: "" }));
            }}
            placeholder={isRTL ? "أدخل اسمك الكامل" : "Enter your full name"}
            className={errors.full_name ? "border-destructive" : ""}
          />
          {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleNext} size="lg">
            {isRTL ? "التالي: بيانات الشركة" : "Next: Company Info"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
