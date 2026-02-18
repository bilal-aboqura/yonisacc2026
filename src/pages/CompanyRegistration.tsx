import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { Step1Account } from "@/components/onboarding/Step1Account";
import { Step2Company } from "@/components/onboarding/Step2Company";
import { Step3Preferences } from "@/components/onboarding/Step3Preferences";
import { Step4Modules } from "@/components/onboarding/Step4Modules";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

const STEP_LABELS_AR = ["معلومات الحساب", "بيانات الشركة", "تفضيلات النظام", "اختيار الوحدات"];
const STEP_LABELS_EN = ["Account Info", "Company Details", "Preferences", "Select Modules"];

const WizardContent = () => {
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
        {/* Thin progress bar */}
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <StepIndicator currentStep={currentStep} isRTL={isRTL} />

      {/* Step content in a clean card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        {currentStep === 1 && <Step1Account isRTL={isRTL} />}
        {currentStep === 2 && <Step2Company isRTL={isRTL} />}
        {currentStep === 3 && <Step3Preferences isRTL={isRTL} />}
        {currentStep === 4 && <Step4Modules isRTL={isRTL} />}
      </div>
    </div>
  );
};

const CompanyRegistration = () => {
  const { isRTL } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/register-company");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-muted/30 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Top bar */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            {isRTL ? "الرئيسية" : "Home"}
          </Button>
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            {isRTL ? "إنشاء شركة جديدة" : "New Company Setup"}
          </div>
          <div className="w-20" /> {/* spacer */}
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 py-8">
        {/* Page headline */}
        <div className="max-w-2xl mx-auto mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {isRTL ? "مرحباً بك في كوستامين 👋" : "Welcome to Costamine 👋"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            {isRTL
              ? "أكمل الخطوات التالية لإعداد نظامك — لا يُحفظ أي شيء حتى الخطوة الأخيرة"
              : "Complete the steps below to set up your system — nothing is saved until the last step"}
          </p>
        </div>

        <OnboardingProvider>
          <WizardContent />
        </OnboardingProvider>
      </div>
    </div>
  );
};

export default CompanyRegistration;
