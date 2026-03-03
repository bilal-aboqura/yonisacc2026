import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { Step2Company } from "@/components/onboarding/Step2Company";
import { Step3Preferences } from "@/components/onboarding/Step3Preferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

const STEP_LABELS_AR = ["بيانات الشركة", "تفضيلات النظام"];
const STEP_LABELS_EN = ["Company Details", "Preferences"];

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

// Step 0 — Account credentials form
const AccountStep = ({
  isRTL,
  onContinue,
}: {
  isRTL: boolean;
  onContinue: (data: { full_name: string; email: string; password: string }) => void;
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signupSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) errs[err.path[0] as string] = err.message; });
      setErrors(errs);
      return;
    }
    onContinue({ full_name: fullName, email, password });
  };

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
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
                ? "أدخل بياناتك — سيتم إنشاء حسابك عند إتمام الإعداد"
                : "Enter your info — account will be created at the final step"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            {isRTL ? "الاسم الكامل" : "Full Name"} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(p => ({ ...p, fullName: "" })); }}
              placeholder={isRTL ? "مثال: أحمد محمد" : "e.g. John Smith"}
              className={cn("ps-10", errors.fullName && "border-destructive")}
            />
          </div>
          {errors.fullName && <p className="text-xs text-destructive">⚠ {errors.fullName}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            {isRTL ? "البريد الإلكتروني" : "Email"} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: "" })); }}
              placeholder="example@email.com"
              className={cn("ps-10", errors.email && "border-destructive")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">⚠ {errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            {isRTL ? "كلمة المرور" : "Password"} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              dir="ltr"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: "" })); }}
              placeholder="••••••••"
              className={cn("ps-10 pe-10", errors.password && "border-destructive")}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">⚠ {errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            {isRTL ? "تأكيد كلمة المرور" : "Confirm Password"} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showConfirm ? "text" : "password"}
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: "" })); }}
              placeholder="••••••••"
              className={cn("ps-10 pe-10", errors.confirmPassword && "border-destructive")}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">⚠ {errors.confirmPassword}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" className="gap-2 min-w-[160px]">
            {isRTL ? "التالي" : "Continue"}
            <Arrow className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

const WizardContent = ({ initialData }: { initialData: { full_name: string; email: string; password: string } }) => {
  const { isRTL } = useLanguage();
  const { currentStep, totalSteps } = useOnboarding();
  const stepLabel = isRTL ? STEP_LABELS_AR[currentStep - 1] : STEP_LABELS_EN[currentStep - 1];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-foreground">{stepLabel}</span>
          <span className="text-xs text-muted-foreground">
            {isRTL ? `${currentStep} من ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <StepIndicator currentStep={currentStep} isRTL={isRTL} />

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        {currentStep === 1 && <Step2Company isRTL={isRTL} />}
        {currentStep === 2 && <Step3Preferences isRTL={isRTL} isFinalStep />}
      </div>
    </div>
  );
};

const CompanyRegistration = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const planId = searchParams.get("plan") || "";
  const [accountData, setAccountData] = useState<{ full_name: string; email: string; password: string } | null>(null);

  return (
    <div className={`min-h-screen bg-muted/30 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Top bar */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => accountData ? setAccountData(null) : navigate("/auth")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            {isRTL ? "رجوع" : "Back"}
          </Button>
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            {isRTL ? "إنشاء حساب جديد" : "Create New Account"}
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 py-8">
        {!accountData ? (
          /* Step 0 — Account info */
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {isRTL ? "مرحباً بك في كوستامين 👋" : "Welcome to Costamine 👋"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                {isRTL
                  ? "أكمل الخطوات التالية لإعداد نظامك — سيتم إنشاء حسابك وشركتك عند الخطوة الأخيرة"
                  : "Complete the steps below — your account and company will be created at the final step"}
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
              <AccountStep isRTL={isRTL} onContinue={setAccountData} />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              {isRTL ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
              <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">
                {isRTL ? "تسجيل الدخول" : "Sign In"}
              </button>
            </p>
          </div>
        ) : (
          /* Steps 1-3 — Company wizard */
          <>
            <div className="max-w-2xl mx-auto mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {isRTL ? `مرحباً ${accountData.full_name} 👋` : `Welcome, ${accountData.full_name} 👋`}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                {isRTL
                  ? "أكمل الخطوات التالية لإعداد شركتك"
                  : "Complete the steps below to set up your company"}
              </p>
            </div>
            <OnboardingProvider initialData={{ ...accountData, plan_id: planId }}>
              <WizardContent initialData={accountData} />
            </OnboardingProvider>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyRegistration;
