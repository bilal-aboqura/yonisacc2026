import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Monitor, Settings, FileText, Package, Calculator, Users, BarChart3, Car, Building2 } from "lucide-react";

interface CompanyScreensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onSaved: () => void;
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

const moduleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  settings: Settings,
  sales: FileText,
  inventory: Package,
  accounting: Calculator,
  hr: Users,
  reports: BarChart3,
  auto_parts: Car,
  gold: Package,
};

const moduleNames: Record<string, { ar: string; en: string }> = {
  settings: { ar: "الإعدادات", en: "Settings" },
  sales: { ar: "المبيعات", en: "Sales" },
  inventory: { ar: "المخزون", en: "Inventory" },
  accounting: { ar: "المحاسبة", en: "Accounting" },
  hr: { ar: "الموارد البشرية", en: "HR" },
  reports: { ar: "التقارير", en: "Reports" },
  auto_parts: { ar: "قطع الغيار", en: "Auto Parts" },
  gold: { ar: "الذهب والمجوهرات", en: "Gold & Jewelry" },
};

const CompanyScreensDialog = ({ open, onOpenChange, company, onSaved }: CompanyScreensDialogProps) => {
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [screens, setScreens] = useState<SystemScreen[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set());
  const [initialScreens, setInitialScreens] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !company) return;
    const load = async () => {
      setLoading(true);
      try {
        // Load all system screens
        const { data: screensData } = await supabase
          .from("system_screens")
          .select("*")
          .order("sort_order");
        setScreens((screensData as SystemScreen[]) || []);

        // Load current company screens
        const { data: compScreens } = await supabase
          .from("client_screens")
          .select("screen_id, is_enabled")
          .eq("company_id", company.id);

        const enabledSet = new Set<string>();
        ((compScreens as any[]) || []).forEach((cs: any) => {
          if (cs.is_enabled) enabledSet.add(cs.screen_id);
        });
        setSelectedScreens(enabledSet);
        setInitialScreens(new Set(enabledSet));
      } catch (e) {
        console.error("Failed to load screens:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, company]);

  const groupedScreens = useMemo(() => {
    const groups: Record<string, SystemScreen[]> = {};
    screens.forEach((s) => {
      if (!groups[s.module]) groups[s.module] = [];
      groups[s.module].push(s);
    });
    return groups;
  }, [screens]);

  const hasChanges = useMemo(() => {
    if (selectedScreens.size !== initialScreens.size) return true;
    for (const id of selectedScreens) {
      if (!initialScreens.has(id)) return true;
    }
    return false;
  }, [selectedScreens, initialScreens]);

  const toggleScreen = (screenId: string) => {
    setSelectedScreens((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) next.delete(screenId);
      else next.add(screenId);
      return next;
    });
  };

  const toggleModule = (module: string) => {
    const moduleScreenIds = groupedScreens[module]?.map((s) => s.id) || [];
    const allSelected = moduleScreenIds.every((id) => selectedScreens.has(id));
    setSelectedScreens((prev) => {
      const next = new Set(prev);
      moduleScreenIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing client_screens for this company
      await supabase
        .from("client_screens")
        .delete()
        .eq("company_id", company.id);

      // Insert selected screens
      if (selectedScreens.size > 0) {
        const rows = Array.from(selectedScreens).map((screenId) => ({
          company_id: company.id,
          screen_id: screenId,
          is_enabled: true,
        }));
        const { error } = await supabase
          .from("client_screens")
          .insert(rows);
        if (error) throw error;
      }

      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم تحديث شاشات الشركة بنجاح" : "Company screens updated successfully",
      });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const modules = Object.keys(groupedScreens);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            {isRTL ? "إدارة الشاشات" : "Manage Screens"}
          </DialogTitle>
          <DialogDescription>
            {company?.name} — {isRTL ? "تحكم في الصفحات المتاحة لهذه الشركة" : "Control which pages are available for this company"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <Tabs defaultValue={modules[0]} className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1.5 bg-transparent p-0 mb-4">
                {modules.map((module) => {
                  const Icon = moduleIcons[module] || Monitor;
                  const moduleScreensArr = groupedScreens[module] || [];
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

              {modules.map((module) => {
                const moduleScreens = groupedScreens[module] || [];
                const allSelected = moduleScreens.every((s) => selectedScreens.has(s.id));

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
                          {moduleScreens.filter((s) => selectedScreens.has(s.id)).length} / {moduleScreens.length}
                        </Badge>
                      </div>

                      {/* Screen Items */}
                      <div className="divide-y">
                        {moduleScreens.map((screen) => (
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
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
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

export default CompanyScreensDialog;
