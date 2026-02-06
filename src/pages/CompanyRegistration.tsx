import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Package, ArrowLeft, Check, Loader2 } from "lucide-react";
import { z } from "zod";

const companySchema = z.object({
  name: z.string().min(2, "اسم الشركة مطلوب").max(100),
  name_en: z.string().max(100).optional(),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  phone: z.string().min(9, "رقم الهاتف غير صالح").max(15),
  commercial_register: z.string().max(50).optional(),
  tax_number: z.string().max(50).optional(),
  activity_type: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
});

interface Plan {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
  duration_months: number;
  max_invoices: number | null;
  max_entries: number | null;
  max_users: number;
  max_branches: number;
  description_ar: string | null;
  description_en: string | null;
}

const CompanyRegistration = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPlans, setIsFetchingPlans] = useState(true);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    email: "",
    phone: "",
    commercial_register: "",
    tax_number: "",
    activity_type: "",
    address: "",
  });

  // Fetch active business verticals for activity_type dropdown
  const { data: verticals } = useQuery({
    queryKey: ["registration-verticals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_verticals")
        .select("id, name_ar, name_en, status")
        .eq("is_active", true)
        .eq("status", "active")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Array<{ id: string; name_ar: string; name_en: string; status: string }>;
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/register-company");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error("Error fetching plans:", error);
        toast.error("حدث خطأ في تحميل الباقات");
      } finally {
        setIsFetchingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep1 = () => {
    try {
      companySchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) {
      toast.error("يرجى اختيار باقة");
      return;
    }

    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً");
      navigate("/auth?redirect=/register-company");
      return;
    }

    setIsLoading(true);

    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: formData.name.trim(),
          name_en: formData.name_en.trim() || null,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          commercial_register: formData.commercial_register.trim() || null,
          tax_number: formData.tax_number.trim() || null,
          activity_type: formData.activity_type.trim() || null,
          address: formData.address.trim() || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create subscription request
      const selectedPlanData = plans.find((p) => p.id === selectedPlan);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (selectedPlanData?.duration_months || 1));

      const { error: subscriptionError } = await supabase.from("subscriptions").insert({
        company_id: company.id,
        plan_id: selectedPlan,
        status: "pending",
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      });

      if (subscriptionError) throw subscriptionError;

      // Create main branch
      const { error: branchError } = await supabase.from("branches").insert({
        company_id: company.id,
        name: "الفرع الرئيسي",
        name_en: "Main Branch",
        is_main: true,
        is_active: true,
      });

      if (branchError) throw branchError;

      toast.success("تم إرسال طلب الاشتراك بنجاح! سيتم مراجعته قريباً");
      navigate("/client");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "حدث خطأ في التسجيل");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-muted/30 py-4 sm:py-6 md:py-8 px-3 sm:px-4 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-3 sm:mb-4"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180 ml-2" : "mr-2"}`} />
            {isRTL ? "العودة للرئيسية" : "Back to Home"}
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {isRTL ? "تسجيل شركة جديدة" : "Register New Company"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            {isRTL ? "أكمل البيانات التالية لتسجيل شركتك والاشتراك في النظام" : "Complete the following to register your company"}
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <div
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {step > 1 ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : "1"}
            </div>
            <div className={`w-16 sm:w-24 h-1 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            <div
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
          </div>
        </div>

        {/* Step 1: Company Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                بيانات الشركة
              </CardTitle>
              <CardDescription>أدخل المعلومات الأساسية لشركتك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name">اسم الشركة (عربي) *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="مثال: شركة النجاح"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name_en">اسم الشركة (إنجليزي)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => handleInputChange("name_en", e.target.value)}
                    placeholder="Example: Success Company"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="info@company.com"
                    dir="ltr"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commercial_register">السجل التجاري</Label>
                  <Input
                    id="commercial_register"
                    value={formData.commercial_register}
                    onChange={(e) => handleInputChange("commercial_register", e.target.value)}
                    placeholder="رقم السجل التجاري"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">الرقم الضريبي</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => handleInputChange("tax_number", e.target.value)}
                    placeholder="رقم التسجيل الضريبي"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity_type">{isRTL ? "نوع النشاط" : "Activity Type"}</Label>
                <Select
                  value={formData.activity_type || "__general__"}
                  onValueChange={(v) => handleInputChange("activity_type", v === "__general__" ? "general" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? "اختر نوع النشاط" : "Select activity type"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__general__">{isRTL ? "تجارة عامة" : "General Trade"}</SelectItem>
                    {verticals?.map((v) => (
                      <SelectItem key={v.id} value={v.name_en}>
                        {isRTL ? v.name_ar : v.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="عنوان الشركة الكامل"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNextStep} size="lg">
                  التالي: اختيار الباقة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Plan */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  اختيار الباقة
                </CardTitle>
                <CardDescription>اختر الباقة المناسبة لاحتياجات شركتك</CardDescription>
              </CardHeader>
              <CardContent>
                {isFetchingPlans ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد باقات متاحة حالياً
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {plans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedPlan === plan.id
                            ? "ring-2 ring-primary border-primary"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            {isRTL ? plan.name_ar : plan.name_en}
                          </CardTitle>
                          <div className="text-2xl font-bold text-primary">
                            {plan.price} ر.س
                            <span className="text-sm font-normal text-muted-foreground">
                              /{plan.duration_months} شهر
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <p className="text-muted-foreground">
                            {isRTL ? plan.description_ar : plan.description_en}
                          </p>
                          <ul className="space-y-1">
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-primary" />
                              {plan.max_invoices ? `${plan.max_invoices} فاتورة` : "فواتير غير محدودة"}
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-primary" />
                              {plan.max_entries ? `${plan.max_entries} قيد` : "قيود غير محدودة"}
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-primary" />
                              {plan.max_users} مستخدم
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-primary" />
                              {plan.max_branches} فرع
                            </li>
                          </ul>
                          {selectedPlan === plan.id && (
                            <div className="pt-2">
                              <span className="inline-flex items-center gap-1 text-primary font-medium">
                                <Check className="h-4 w-4" />
                                تم الاختيار
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                السابق
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedPlan || isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال طلب الاشتراك"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyRegistration;
