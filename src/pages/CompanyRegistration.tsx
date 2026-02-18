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
import { ArrowLeft, Loader2 } from "lucide-react";

const WizardContent = () => {
  const { isRTL } = useLanguage();
  const { currentStep } = useOnboarding();

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator currentStep={currentStep} isRTL={isRTL} />

      {currentStep === 1 && <Step1Account isRTL={isRTL} />}
      {currentStep === 2 && <Step2Company isRTL={isRTL} />}
      {currentStep === 3 && <Step3Preferences isRTL={isRTL} />}
      {currentStep === 4 && <Step4Modules isRTL={isRTL} />}
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
    <div className={`min-h-screen bg-muted/30 py-6 px-4 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="max-w-2xl mx-auto mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180 ml-2" : "mr-2"}`} />
          {isRTL ? "العودة للرئيسية" : "Back to Home"}
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {isRTL ? "تسجيل شركة جديدة" : "Register New Company"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {isRTL
            ? "أكمل الخطوات التالية لتسجيل شركتك — لن يتم حفظ أي بيانات حتى الخطوة الأخيرة"
            : "Complete the steps below — nothing is saved until the final step"}
        </p>
      </div>

      <OnboardingProvider>
        <WizardContent />
      </OnboardingProvider>
    </div>
  );
};

export default CompanyRegistration;
