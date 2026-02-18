import { Check, User, Building2, Settings, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "الحساب", labelEn: "Account", icon: User },
  { label: "الشركة", labelEn: "Company", icon: Building2 },
  { label: "التفضيلات", labelEn: "Preferences", icon: Settings },
  { label: "الوحدات", labelEn: "Modules", icon: Layers },
];

interface StepIndicatorProps {
  currentStep: number;
  isRTL?: boolean;
}

export const StepIndicator = ({ currentStep, isRTL }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isDone = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        const Icon = step.icon;

        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isDone && "bg-primary border-primary text-primary-foreground",
                  isActive && "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30",
                  !isDone && !isActive && "bg-background border-border text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isRTL ? step.label : step.labelEn}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 sm:w-20 mx-1 sm:mx-2 mb-4 transition-all duration-300",
                  currentStep > stepNum ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
