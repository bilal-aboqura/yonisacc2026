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
import { Loader2, Save } from "lucide-react";
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
}

export const PricingManager = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [editingPlans, setEditingPlans] = useState<Record<string, Partial<Plan>>>({});

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

  const savePlan = (planId: string) => {
    const changes = editingPlans[planId];
    if (changes && Object.keys(changes).length > 0) {
      updateMutation.mutate({ id: planId, data: changes });
    }
  };

  const hasChanges = (planId: string) => {
    return editingPlans[planId] && Object.keys(editingPlans[planId]).length > 0;
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
        {plans?.map((plan) => (
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
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
