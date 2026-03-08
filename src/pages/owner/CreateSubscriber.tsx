import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, UserPlus, Eye, EyeOff, Loader2, Building2, Mail, KeyRound, Phone, User, FileText, MapPin, Tag } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const ALL_MODULES = [
  { key: "accounting", labelAr: "المحاسبة", labelEn: "Accounting" },
  { key: "sales", labelAr: "المبيعات", labelEn: "Sales" },
  { key: "purchases", labelAr: "المشتريات", labelEn: "Purchases" },
  { key: "inventory", labelAr: "المخزون", labelEn: "Inventory" },
  { key: "hr", labelAr: "الموارد البشرية", labelEn: "HR" },
  { key: "treasury", labelAr: "الخزينة", labelEn: "Treasury" },
  { key: "reports", labelAr: "التقارير", labelEn: "Reports" },
  { key: "pos", labelAr: "نقاط البيع", labelEn: "POS" },
  { key: "gold", labelAr: "الذهب والمجوهرات", labelEn: "Gold & Jewelry" },
  { key: "autoparts", labelAr: "قطع السيارات", labelEn: "Auto Parts" },
  { key: "clinic", labelAr: "العيادة", labelEn: "Clinic" },
  { key: "realestate", labelAr: "العقارات", labelEn: "Real Estate" },
  { key: "delivery", labelAr: "التوصيل", labelEn: "Delivery" },
  { key: "assets", labelAr: "الأصول الثابتة", labelEn: "Fixed Assets" },
];

const isStrongPassword = (pw: string) =>
  pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(pw);

const CreateSubscriber = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULES.map(m => m.key));
  const [form, setForm] = useState({
    email: "", password: "", company_name: "", company_name_en: "",
    full_name: "", phone: "", plan_id: "", activity_type: "",
    tax_number: "", commercial_register: "", address: "",
  });

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id, name_ar, name_en, price, duration_months")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("create-subscriber", {
        body: { ...form, allowed_modules: selectedModules },
      });
      if (response.error) throw new Error(response.error.message || "Failed");
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["owner-subscribers"] });
      toast({
        title: isRTL ? "تم إنشاء المشترك" : "Subscriber Created",
        description: isRTL ? `تم إنشاء حساب ${data.email} بنجاح` : `Account ${data.email} created successfully`,
      });
      navigate("/owner/subscribers");
    },
    onError: (error: Error) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleModule = (key: string) => {
    setSelectedModules(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  };

  const canSubmit = form.email && form.company_name && form.plan_id && isStrongPassword(form.password) && selectedModules.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/owner/subscribers")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            {isRTL ? "إضافة مشترك جديد" : "Add New Subscriber"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL ? "أدخل بيانات المشترك وحدد المديولات المتاحة" : "Enter subscriber details and select available modules"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                {isRTL ? "بيانات الحساب" : "Account Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني *" : "Email *"}</Label>
                  <Input type="email" dir="ltr" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "كلمة المرور *" : "Password *"}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"} dir="ltr"
                      value={form.password} onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Pass@123"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute end-0 top-0 h-10 w-10" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {form.password && !isStrongPassword(form.password) && (
                    <p className="text-xs text-destructive">{isRTL ? "حرف كبير + صغير + رقم + رمز (8 أحرف)" : "Upper + lower + number + symbol (8 chars)"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {isRTL ? "بيانات الشركة" : "Company Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم الشركة (عربي) *" : "Company Name (Arabic) *"}</Label>
                  <Input value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}</Label>
                  <Input dir="ltr" value={form.company_name_en} onChange={(e) => updateField("company_name_en", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم المسؤول" : "Contact Name"}</Label>
                  <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم الجوال" : "Phone"}</Label>
                  <Input dir="ltr" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="05XXXXXXXX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الباقة *" : "Plan *"}</Label>
                <Select value={form.plan_id} onValueChange={(v) => updateField("plan_id", v)}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الباقة" : "Select plan"} /></SelectTrigger>
                  <SelectContent>
                    {(plans || []).map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {isRTL ? plan.name_ar : plan.name_en} — {plan.price} {isRTL ? "ر.س" : "SAR"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "نوع النشاط" : "Activity Type"}</Label>
                  <Input value={form.activity_type} onChange={(e) => updateField("activity_type", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الرقم الضريبي" : "Tax Number"}</Label>
                  <Input dir="ltr" value={form.tax_number} onChange={(e) => updateField("tax_number", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "السجل التجاري" : "Commercial Register"}</Label>
                  <Input dir="ltr" value={form.commercial_register} onChange={(e) => updateField("commercial_register", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "العنوان" : "Address"}</Label>
                  <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Module Selection */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {isRTL ? "المديولات المتاحة" : "Available Modules"}
              </CardTitle>
              <CardDescription>
                {isRTL ? `${selectedModules.length} من ${ALL_MODULES.length} مديول محدد` : `${selectedModules.length} of ${ALL_MODULES.length} modules selected`}
              </CardDescription>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedModules(ALL_MODULES.map(m => m.key))}>
                  {isRTL ? "تحديد الكل" : "Select All"}
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedModules([])}>
                  {isRTL ? "إلغاء الكل" : "Deselect All"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {ALL_MODULES.map((mod) => (
                    <label
                      key={mod.key}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedModules.includes(mod.key)}
                        onCheckedChange={() => toggleModule(mod.key)}
                      />
                      <span className="text-sm font-medium">{isRTL ? mod.labelAr : mod.labelEn}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              {selectedModules.length === 0 && (
                <p className="text-xs text-destructive mt-2">{isRTL ? "يجب تحديد مديول واحد على الأقل" : "At least one module must be selected"}</p>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRTL ? "إنشاء المشترك" : "Create Subscriber"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSubscriber;
