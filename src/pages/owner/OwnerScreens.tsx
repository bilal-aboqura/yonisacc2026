import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Monitor, Settings, FileText, Package, Calculator, Users, BarChart3 } from "lucide-react";

const moduleIcons: Record<string, any> = {
  settings: Settings,
  sales: FileText,
  inventory: Package,
  accounting: Calculator,
  hr: Users,
  reports: BarChart3,
};

const OwnerScreens = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set());

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["owner-plans-for-screens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: screens, isLoading: screensLoading } = useQuery({
    queryKey: ["system-screens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_screens")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: planScreens, isLoading: planScreensLoading } = useQuery({
    queryKey: ["plan-screens", selectedPlan],
    queryFn: async () => {
      if (!selectedPlan) return [];
      const { data, error } = await supabase
        .from("plan_screens")
        .select("screen_id")
        .eq("plan_id", selectedPlan);
      if (error) throw error;
      return data.map((ps) => ps.screen_id);
    },
    enabled: !!selectedPlan,
  });

  // Update selected screens when plan screens data changes
  useState(() => {
    if (planScreens) {
      setSelectedScreens(new Set(planScreens));
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) return;

      // Delete existing plan screens
      await supabase.from("plan_screens").delete().eq("plan_id", selectedPlan);

      // Insert new plan screens
      if (selectedScreens.size > 0) {
        const planScreensData = Array.from(selectedScreens).map((screenId) => ({
          plan_id: selectedPlan,
          screen_id: screenId,
        }));
        const { error } = await supabase.from("plan_screens").insert(planScreensData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-screens"] });
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ شاشات الباقة بنجاح" : "Plan screens saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ أثناء الحفظ" : "Error saving plan screens",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  // Update selectedScreens when planScreens changes
  const handleScreensLoaded = () => {
    if (planScreens) {
      setSelectedScreens(new Set(planScreens));
    }
  };

  // Call this effect when planScreens changes
  if (planScreens && !planScreensLoading && selectedScreens.size === 0 && planScreens.length > 0) {
    setSelectedScreens(new Set(planScreens));
  }

  const toggleScreen = (screenId: string) => {
    const newSelected = new Set(selectedScreens);
    if (newSelected.has(screenId)) {
      newSelected.delete(screenId);
    } else {
      newSelected.add(screenId);
    }
    setSelectedScreens(newSelected);
  };

  const toggleModule = (module: string) => {
    const moduleScreens = screens?.filter((s) => s.module === module) || [];
    const allSelected = moduleScreens.every((s) => selectedScreens.has(s.id));
    const newSelected = new Set(selectedScreens);

    moduleScreens.forEach((s) => {
      if (allSelected) {
        newSelected.delete(s.id);
      } else {
        newSelected.add(s.id);
      }
    });

    setSelectedScreens(newSelected);
  };

  const groupedScreens = screens?.reduce((acc, screen) => {
    if (!acc[screen.module]) {
      acc[screen.module] = [];
    }
    acc[screen.module].push(screen);
    return acc;
  }, {} as Record<string, typeof screens>);

  const moduleNames: Record<string, { ar: string; en: string }> = {
    settings: { ar: "الإعدادات", en: "Settings" },
    sales: { ar: "المبيعات", en: "Sales" },
    inventory: { ar: "المخزون", en: "Inventory" },
    accounting: { ar: "المحاسبة", en: "Accounting" },
    hr: { ar: "الموارد البشرية", en: "HR" },
    reports: { ar: "التقارير", en: "Reports" },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {isRTL ? "إدارة شاشات الباقات" : "Plan Screens Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "تحديد الشاشات المتاحة لكل باقة" : "Define available screens for each plan"}
          </p>
        </div>
        {selectedPlan && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gradient-primary text-white"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ التغييرات" : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Plans Selection */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {isRTL ? "اختر الباقة" : "Select Plan"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="flex gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-32" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {plans?.map((plan) => (
                <Button
                  key={plan.id}
                  variant={selectedPlan === plan.id ? "default" : "outline"}
                  className={selectedPlan === plan.id ? "gradient-primary text-white" : ""}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {isRTL ? plan.name_ar : plan.name_en}
                  <Badge variant="secondary" className="ms-2">
                    {plan.price} SAR
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screens Selection */}
      {selectedPlan && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>
              {isRTL ? "الشاشات المتاحة" : "Available Screens"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {screensLoading || planScreensLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue={Object.keys(groupedScreens || {})[0]} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-6">
                  {Object.keys(groupedScreens || {}).map((module) => {
                    const Icon = moduleIcons[module] || Monitor;
                    const moduleScreensArr = groupedScreens?.[module] || [];
                    const selectedCount = moduleScreensArr.filter((s) =>
                      selectedScreens.has(s.id)
                    ).length;

                    return (
                      <TabsTrigger
                        key={module}
                        value={module}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {isRTL ? moduleNames[module]?.ar : moduleNames[module]?.en}
                        <Badge variant="secondary" className="ms-1">
                          {selectedCount}/{moduleScreensArr.length}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {Object.entries(groupedScreens || {}).map(([module, moduleScreens]) => {
                  const allSelected = moduleScreens?.every((s) => selectedScreens.has(s.id));

                  return (
                    <TabsContent key={module} value={module} className="mt-0">
                      <div className="border rounded-lg">
                        {/* Module Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleModule(module)}
                            />
                            <span className="font-medium">
                              {isRTL ? "تحديد الكل" : "Select All"}
                            </span>
                          </div>
                          <Badge>
                            {moduleScreens?.filter((s) => selectedScreens.has(s.id)).length} /{" "}
                            {moduleScreens?.length}
                          </Badge>
                        </div>

                        {/* Screens List */}
                        <div className="divide-y">
                          {moduleScreens?.map((screen) => (
                            <div
                              key={screen.id}
                              className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                            >
                              <Checkbox
                                checked={selectedScreens.has(screen.id)}
                                onCheckedChange={() => toggleScreen(screen.id)}
                              />
                              <div className="flex-1">
                                <p className="font-medium">
                                  {isRTL ? screen.name_ar : screen.name_en}
                                </p>
                                {(screen.description_ar || screen.description_en) && (
                                  <p className="text-sm text-muted-foreground">
                                    {isRTL ? screen.description_ar : screen.description_en}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline">{screen.key}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnerScreens;
