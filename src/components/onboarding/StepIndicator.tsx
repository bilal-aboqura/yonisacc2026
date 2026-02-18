import { Check, Building2, Settings, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "الشركة", labelEn: "Company", icon: Building2 },
  { label: "التفضيلات", labelEn: "Preferences", icon: Settings },
  { label: "الوحدات", labelEn: "Modules", icon: Layers },
];

interface StepIndicatorProps {
  currentStep: number;
  isRTL?: boolean;
}

export const StepIndicator = ({ currentStep, isRTL }: StepIndicatorProps) => {
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="mb-10">
      {/* Step circles row */}
      <div className="flex items-center justify-between relative">
        {/* Progress track */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border mx-10 z-0">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isDone = currentStep > stepNum;
          const isActive = currentStep === stepNum;
          const Icon = step.icon;

          return (
            <div key={stepNum} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 bg-background",
                  isDone && "bg-primary border-primary text-primary-foreground shadow-md",
                  isActive && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110",
                  !isDone && !isActive && "border-border text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold whitespace-nowrap hidden sm:block",
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {isRTL ? step.label : step.labelEn}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
