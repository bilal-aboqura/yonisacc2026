import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Save, Loader2, Settings, FileText, Package,
  Calculator, Users, BarChart3, Car, Monitor
} from "lucide-react";
import {
  Gem, ShoppingCart, Scissors, Sparkles,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gem, Car, ShoppingCart, Scissors, Sparkles,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store,
};

const moduleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  settings: Settings,
  sales: FileText,
  inventory: Package,
  accounting: Calculator,
  hr: Users,
  reports: BarChart3,
  auto_parts: Car,
};

const moduleNames: Record<string, { ar: string; en: string }> = {
  settings: { ar: "الإعدادات", en: "Settings" },
  sales: { ar: "المبيعات", en: "Sales" },
  inventory: { ar: "المخزون", en: "Inventory" },
  accounting: { ar: "المحاسبة", en: "Accounting" },
  hr: { ar: "الموارد البشرية", en: "HR" },
  reports: { ar: "التقارير", en: "Reports" },
  auto_parts: { ar: "قطع الغيار", en: "Auto Parts" },
};

interface BusinessVertical {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  color: string;
}

interface VerticalScreensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vertical: BusinessVertical | null;
}

interface SystemScreen {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  module: string;
  sort_order: number;
}

const VerticalScreensDialog = ({ open, onOpenChange, vertical }: VerticalScreensDialogProps) => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: screens, isLoading: screensLoading } = useQuery({
    queryKey: ["system-screens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_screens")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as SystemScreen[];
    },
  });

  const { data: verticalScreenIds, isLoading: vsLoading } = useQuery({
    queryKey: ["vertical-screens", vertical?.id],
    queryFn: async () => {
      if (!vertical) return [];
      const { data, error } = await supabase
        .from("vertical_screens" as any)
        .select("screen_id")
        .eq("vertical_id", vertical.id);
      if (error) throw error;
      return (data || []).map((vs: any) => vs.screen_id as string);
    },
    enabled: !!vertical && open,
  });

  // Sync selected screens when data loads
  useEffect(() => {
    if (verticalScreenIds) {
      setSelectedScreens(new Set(verticalScreenIds));
      setHasChanges(false);
    }
  }, [verticalScreenIds]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!vertical) return;

      // Delete existing vertical screens
      await supabase
        .from("vertical_screens" as any)
        .delete()
        .eq("vertical_id", vertical.id);

      // Insert new mappings
      if (selectedScreens.size > 0) {
        const rows = Array.from(selectedScreens).map((screenId) => ({
          vertical_id: vertical.id,
          screen_id: screenId,
        }));
        const { error } = await supabase
          .from("vertical_screens" as any)
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vertical-screens", vertical?.id] });
      setHasChanges(false);
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ شاشات النشاط بنجاح" : "Activity screens saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ أثناء الحفظ" : "Error saving screens",
        variant: "destructive",
      });
    },
  });

  const toggleScreen = (screenId: string) => {
    const newSelected = new Set(selectedScreens);
    if (newSelected.has(screenId)) {
      newSelected.delete(screenId);
    } else {
      newSelected.add(screenId);
    }
    setSelectedScreens(newSelected);
    setHasChanges(true);
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
    setHasChanges(true);
  };

  const groupedScreens = screens?.reduce((acc, screen) => {
    if (!acc[screen.module]) {
      acc[screen.module] = [];
    }
    acc[screen.module].push(screen);
    return acc;
  }, {} as Record<string, SystemScreen[]>);

  const isLoading = screensLoading || vsLoading;
  const IconComp = vertical ? (iconMap[vertical.icon] || Store) : Store;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRTL ? "شاشات النشاط" : "Activity Screens"}
          </DialogTitle>
        </DialogHeader>

        {vertical && (
          <>
            {/* Activity Info Header */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0",
                vertical.color
              )}>
                <IconComp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isRTL ? vertical.name_ar : vertical.name_en}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? vertical.description_ar : vertical.description_en}
                </p>
              </div>
              <Badge className="ms-auto" variant="secondary">
                {selectedScreens.size} {isRTL ? "شاشة" : "screens"}
              </Badge>
            </div>

            {/* Screens by Module */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue={Object.keys(groupedScreens || {})[0]} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1.5 bg-transparent p-0 mb-4">
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
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5 gap-1.5 text-sm"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {isRTL ? moduleNames[module]?.ar : moduleNames[module]?.en}
                        <Badge variant="secondary" className="ms-1 text-xs px-1.5 py-0">
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
                        {/* Select All */}
                        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleModule(module)}
                            />
                            <span className="font-medium text-sm">
                              {isRTL ? "تحديد الكل" : "Select All"}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {moduleScreens?.filter((s) => selectedScreens.has(s.id)).length} / {moduleScreens?.length}
                          </Badge>
                        </div>

                        {/* Screen Items */}
                        <div className="divide-y">
                          {moduleScreens?.map((screen) => (
                            <div
                              key={screen.id}
                              className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => toggleScreen(screen.id)}
                            >
                              <Checkbox
                                checked={selectedScreens.has(screen.id)}
                                onCheckedChange={() => toggleScreen(screen.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">
                                  {isRTL ? screen.name_ar : screen.name_en}
                                </p>
                                {(screen.description_ar || screen.description_en) && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {isRTL ? screen.description_ar : screen.description_en}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {screen.key}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasChanges}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {isRTL ? "حفظ التغييرات" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerticalScreensDialog;
