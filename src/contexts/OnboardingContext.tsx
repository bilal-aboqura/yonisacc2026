import { createContext, useContext, useState, ReactNode } from "react";

export interface OnboardingData {
  // Step 1: Account
  full_name: string;
  // Step 2: Company
  company_name: string;
  company_name_en: string;
  email: string;
  phone: string;
  commercial_register: string;
  tax_number: string;
  address: string;
  // Step 3: Preferences
  industry: string;
  country: string;
  timezone: string;
  language: string;
  base_currency: string;
  // Step 4: Module Selection
  selected_modules: string[];
}

const defaultData: OnboardingData = {
  full_name: "",
  company_name: "",
  company_name_en: "",
  email: "",
  phone: "",
  commercial_register: "",
  tax_number: "",
  address: "",
  industry: "",
  country: "SA",
  timezone: "Asia/Riyadh",
  language: "ar",
  base_currency: "SAR",
  selected_modules: [],
};

interface OnboardingContextType {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
  currentStep: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const update = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const goToStep = (step: number) => setCurrentStep(step);

  return (
    <OnboardingContext.Provider value={{ data, update, currentStep, goNext, goBack, goToStep, totalSteps }}>
      {children}
    </OnboardingContext.Provider>
  );
};
