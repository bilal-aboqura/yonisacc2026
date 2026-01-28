import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, X } from "lucide-react";
import { useState } from "react";

interface Plan {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  duration_months: number;
  max_invoices: number | null;
  max_entries: number | null;
  max_users: number | null;
  max_branches: number | null;
  is_active: boolean;
  sort_order: number | null;
  features_ar?: string[] | null;
  features_en?: string[] | null;
  not_included_ar?: string[] | null;
  not_included_en?: string[] | null;
}

// Default features for plans
const defaultPlanFeatures: Record<string, { features_ar: string[]; features_en: string[]; not_included_ar: string[]; not_included_en: string[] }> = {
  "Free": {
    features_ar: ["15 فاتورة شهرياً", "15 قيد محاسبي", "مستخدم واحد", "فرع واحد", "الدعم الفني"],
    features_en: ["15 invoices/month", "15 journal entries", "1 user", "1 branch", "Technical support"],
    not_included_ar: ["الموارد البشرية", "تعدد الفروع"],
    not_included_en: ["HR module", "Multi-branch"],
  },
  "Basic": {
    features_ar: ["50 فاتورة شهرياً", "100 قيد محاسبي", "مستخدم واحد", "فرع واحد", "الدعم الفني", "التقارير المالية"],
    features_en: ["50 invoices/month", "100 journal entries", "1 user", "1 branch", "Technical support", "Financial reports"],
    not_included_ar: ["الموارد البشرية", "تعدد الفروع"],
    not_included_en: ["HR module", "Multi-branch"],
  },
  "Advanced": {
    features_ar: ["75 فاتورة شهرياً", "150 قيد محاسبي", "3 مستخدمين", "فرعين", "الدعم الفني", "التقارير المالية", "إدارة المخزون"],
    features_en: ["75 invoices/month", "150 journal entries", "3 users", "2 branches", "Technical support", "Financial reports", "Inventory management"],
    not_included_ar: ["الموارد البشرية"],
    not_included_en: ["HR module"],
  },
  "Enterprise": {
    features_ar: ["فواتير غير محدودة", "قيود غير محدودة", "مستخدمين غير محدود", "فروع غير محدودة", "الدعم الفني المتميز", "التقارير المالية", "إدارة المخزون", "الموارد البشرية", "API مخصص"],
    features_en: ["Unlimited invoices", "Unlimited entries", "Unlimited users", "Unlimited branches", "Premium support", "Financial reports", "Inventory management", "HR module", "Custom API"],
    not_included_ar: [],
    not_included_en: [],
  },
};

export const PricingManager = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [editingPlans, setEditingPlans] = useState<Record<string, Partial<Plan>>>({});
  const [editingFeatures, setEditingFeatures] = useState<Record<string, {
    features_ar: string[];
    features_en: string[];
    not_included_ar: string[];
    not_included_en: string[];
  }>>({});

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data as Plan[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Plan> }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setEditingPlans({});
      setEditingFeatures({});
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ الباقة بنجاح" : "Plan saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ أثناء الحفظ" : "An error occurred while saving",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
  });

  const handleChange = (planId: string, field: keyof Plan, value: any) => {
    setEditingPlans((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], [field]: value },
    }));
  };

  const getDisplayValue = (plan: Plan, field: keyof Plan) => {
    return editingPlans[plan.id]?.[field] ?? plan[field];
  };

  const initializeFeaturesForPlan = (plan: Plan) => {
    const defaults = defaultPlanFeatures[plan.name_en] || defaultPlanFeatures["Basic"];
    return {
      features_ar: plan.features_ar?.length ? [...plan.features_ar] : [...defaults.features_ar],
      features_en: plan.features_en?.length ? [...plan.features_en] : [...defaults.features_en],
      not_included_ar: plan.not_included_ar?.length !== undefined ? [...plan.not_included_ar] : [...defaults.not_included_ar],
      not_included_en: plan.not_included_en?.length !== undefined ? [...plan.not_included_en] : [...defaults.not_included_en],
    };
  };

  const getFeatures = (plan: Plan) => {
    if (editingFeatures[plan.id]) {
      return editingFeatures[plan.id];
    }
    return initializeFeaturesForPlan(plan);
  };

  const updateFeature = (planId: string, type: 'features_ar' | 'features_en' | 'not_included_ar' | 'not_included_en', index: number, value: string) => {
    setEditingFeatures((prev) => {
      const current = prev[planId] || initializeFeaturesForPlan(plans?.find(p => p.id === planId)!);
      const updated = [...current[type]];
      updated[index] = value;
      return {
        ...prev,
        [planId]: { ...current, [type]: updated },
      };
    });
  };

  const addFeature = (planId: string, type: 'features_ar' | 'features_en' | 'not_included_ar' | 'not_included_en') => {
    setEditingFeatures((prev) => {
      const current = prev[planId] || initializeFeaturesForPlan(plans?.find(p => p.id === planId)!);
      return {
        ...prev,
        [planId]: { ...current, [type]: [...current[type], ""] },
      };
    });
  };

  const removeFeature = (planId: string, type: 'features_ar' | 'features_en' | 'not_included_ar' | 'not_included_en', index: number) => {
    setEditingFeatures((prev) => {
      const current = prev[planId] || initializeFeaturesForPlan(plans?.find(p => p.id === planId)!);
      const updated = current[type].filter((_, i) => i !== index);
      return {
        ...prev,
        [planId]: { ...current, [type]: updated },
      };
    });
  };

  const savePlan = (planId: string) => {
    const changes = { ...editingPlans[planId] };
    const featuresChanges = editingFeatures[planId];
    
    // Note: Features are stored locally since DB columns aren't added yet
    // Once migration runs, uncomment the lines below
    // if (featuresChanges) {
    //   changes.features_ar = featuresChanges.features_ar;
    //   changes.features_en = featuresChanges.features_en;
    //   changes.not_included_ar = featuresChanges.not_included_ar;
    //   changes.not_included_en = featuresChanges.not_included_en;
    // }
    
    if (Object.keys(changes).length > 0 || featuresChanges) {
      updateMutation.mutate({ id: planId, data: changes });
    }
  };

  const hasChanges = (planId: string) => {
    return (editingPlans[planId] && Object.keys(editingPlans[planId]).length > 0) || !!editingFeatures[planId];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">
        {isRTL ? "إدارة الباقات" : "Manage Plans"}
      </h2>

      <div className="grid gap-6">
        {plans?.map((plan) => {
          const features = getFeatures(plan);
          
          return (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">
                  {isRTL ? plan.name_ar : plan.name_en}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: plan.id, is_active: checked })
                    }
                  />
                  <Button
                    size="sm"
                    onClick={() => savePlan(plan.id)}
                    disabled={!hasChanges(plan.id) || updateMutation.isPending}
                    className="gradient-primary text-white"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                    ) : (
                      <Save className="h-4 w-4 me-2" />
                    )}
                    {isRTL ? "حفظ" : "Save"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                    <Input
                      value={getDisplayValue(plan, "name_ar") as string}
                      onChange={(e) => handleChange(plan.id, "name_ar", e.target.value)}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                    <Input
                      value={getDisplayValue(plan, "name_en") as string}
                      onChange={(e) => handleChange(plan.id, "name_en", e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                    <Textarea
                      value={(getDisplayValue(plan, "description_ar") as string) || ""}
                      onChange={(e) => handleChange(plan.id, "description_ar", e.target.value)}
                      dir="rtl"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                    <Textarea
                      value={(getDisplayValue(plan, "description_en") as string) || ""}
                      onChange={(e) => handleChange(plan.id, "description_en", e.target.value)}
                      dir="ltr"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Pricing & Limits */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? "السعر" : "Price"}</Label>
                    <Input
                      type="number"
                      value={getDisplayValue(plan, "price") as number}
                      onChange={(e) => handleChange(plan.id, "price", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "المدة (شهور)" : "Duration (months)"}</Label>
                    <Input
                      type="number"
                      value={getDisplayValue(plan, "duration_months") as number}
                      onChange={(e) => handleChange(plan.id, "duration_months", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "حد الفواتير" : "Max Invoices"}</Label>
                    <Input
                      type="number"
                      value={(getDisplayValue(plan, "max_invoices") as number) || ""}
                      onChange={(e) => handleChange(plan.id, "max_invoices", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={isRTL ? "غير محدود" : "Unlimited"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "حد القيود" : "Max Entries"}</Label>
                    <Input
                      type="number"
                      value={(getDisplayValue(plan, "max_entries") as number) || ""}
                      onChange={(e) => handleChange(plan.id, "max_entries", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={isRTL ? "غير محدود" : "Unlimited"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "المستخدمين" : "Max Users"}</Label>
                    <Input
                      type="number"
                      value={(getDisplayValue(plan, "max_users") as number) || ""}
                      onChange={(e) => handleChange(plan.id, "max_users", e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                {/* Features */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">{isRTL ? "المميزات المتاحة" : "Included Features"}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Arabic Features */}
                    <div className="space-y-2">
                      <Label>{isRTL ? "المميزات (عربي)" : "Features (Arabic)"}</Label>
                      <div className="space-y-2">
                        {features.features_ar.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => updateFeature(plan.id, 'features_ar', index, e.target.value)}
                              dir="rtl"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeFeature(plan.id, 'features_ar', index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addFeature(plan.id, 'features_ar')}
                        >
                          <Plus className="h-4 w-4 me-1" />
                          {isRTL ? "إضافة" : "Add"}
                        </Button>
                      </div>
                    </div>

                    {/* English Features */}
                    <div className="space-y-2">
                      <Label>{isRTL ? "المميزات (إنجليزي)" : "Features (English)"}</Label>
                      <div className="space-y-2">
                        {features.features_en.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => updateFeature(plan.id, 'features_en', index, e.target.value)}
                              dir="ltr"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeFeature(plan.id, 'features_en', index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addFeature(plan.id, 'features_en')}
                        >
                          <Plus className="h-4 w-4 me-1" />
                          {isRTL ? "إضافة" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Not Included Features */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">{isRTL ? "غير متاحة في هذه الباقة" : "Not Included"}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Arabic Not Included */}
                    <div className="space-y-2">
                      <Label>{isRTL ? "غير متاح (عربي)" : "Not Included (Arabic)"}</Label>
                      <div className="space-y-2">
                        {features.not_included_ar.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => updateFeature(plan.id, 'not_included_ar', index, e.target.value)}
                              dir="rtl"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeFeature(plan.id, 'not_included_ar', index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addFeature(plan.id, 'not_included_ar')}
                        >
                          <Plus className="h-4 w-4 me-1" />
                          {isRTL ? "إضافة" : "Add"}
                        </Button>
                      </div>
                    </div>

                    {/* English Not Included */}
                    <div className="space-y-2">
                      <Label>{isRTL ? "غير متاح (إنجليزي)" : "Not Included (English)"}</Label>
                      <div className="space-y-2">
                        {features.not_included_en.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => updateFeature(plan.id, 'not_included_en', index, e.target.value)}
                              dir="ltr"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeFeature(plan.id, 'not_included_en', index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addFeature(plan.id, 'not_included_en')}
                        >
                          <Plus className="h-4 w-4 me-1" />
                          {isRTL ? "إضافة" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
