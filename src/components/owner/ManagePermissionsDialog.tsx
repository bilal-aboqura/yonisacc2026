import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ManagePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onSaved: () => void;
}

interface Permission {
  id: string;
  code: string;
  module: string;
  description: string;
  description_ar: string | null;
}

const moduleLabels: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  accounting: { ar: "المحاسبة", en: "Accounting" },
  sales: { ar: "المبيعات", en: "Sales" },
  purchases: { ar: "المشتريات", en: "Purchases" },
  inventory: { ar: "المخزون", en: "Inventory" },
  reports: { ar: "التقارير", en: "Reports" },
  hr: { ar: "الموارد البشرية", en: "Human Resources" },
  treasury: { ar: "الخزينة", en: "Treasury" },
  contacts: { ar: "جهات الاتصال", en: "Contacts" },
  settings: { ar: "الإعدادات", en: "Settings" },
  print: { ar: "الطباعة", en: "Print" },
  auto_parts: { ar: "قطع الغيار", en: "Auto Parts" },
  gold: { ar: "الذهب والمجوهرات", en: "Gold & Jewelry" },
  pos: { ar: "نقاط البيع", en: "POS" },
  clinic: { ar: "العيادة", en: "Clinic" },
  realestate: { ar: "العقارات", en: "Real Estate" },
  delivery: { ar: "التوصيل", en: "Delivery" },
  assets: { ar: "الأصول الثابتة", en: "Fixed Assets" },
};

/**
 * Owner-level dialog to manage plan_permission_bounds for a company's plan.
 * This sets the ceiling of what permissions are available to the company,
 * regardless of their internal RBAC role assignments.
 */
const ManagePermissionsDialog = ({ open, onOpenChange, company, onSaved }: ManagePermissionsDialogProps) => {
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [planId, setPlanId] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !company) return;
    const load = async () => {
      setLoading(true);
      try {
        // Load all RBAC permissions
        const { data: permsData } = await supabase
          .from("rbac_permissions" as any)
          .select("*")
          .order("module, code");
        setPermissions((permsData as any) || []);

        // Get company's active plan
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("company_id", company.id)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const pId = sub?.plan_id || null;
        setPlanId(pId);

        // Load existing plan_permission_bounds (blocked permissions)
        if (pId) {
          const { data: bounds } = await supabase
            .from("plan_permission_bounds" as any)
            .select("permission_id, allowed")
            .eq("plan_id", pId)
            .eq("allowed", false);
          
          const blocked = new Set<string>();
          ((bounds as any) || []).forEach((b: any) => blocked.add(b.permission_id));
          setBlockedIds(blocked);
        } else {
          setBlockedIds(new Set());
        }
      } catch (e) {
        console.error("Failed to load permissions:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, company]);

  const groupedPerms = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  const togglePermission = (permId: string) => {
    setBlockedIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!planId) {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "لا توجد باقة نشطة" : "No active plan found", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Delete existing bounds for this plan
      await supabase
        .from("plan_permission_bounds" as any)
        .delete()
        .eq("plan_id", planId);

      // Insert blocked permissions
      if (blockedIds.size > 0) {
        const inserts = Array.from(blockedIds).map(pid => ({
          plan_id: planId,
          permission_id: pid,
          allowed: false,
        }));
        const { error } = await supabase
          .from("plan_permission_bounds" as any)
          .insert(inserts);
        if (error) throw error;
      }

      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم تحديث حدود الصلاحيات" : "Permission bounds updated",
      });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isRTL ? "حدود صلاحيات الباقة" : "Plan Permission Bounds"}
          </DialogTitle>
          <DialogDescription>
            {company?.name} — {isRTL ? "حدد الصلاحيات المتاحة لهذه الباقة (السقف الأعلى)" : "Set the maximum permissions available for this plan"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 pb-4">
              {Object.entries(groupedPerms).map(([module, perms]) => {
                const label = moduleLabels[module] || { ar: module, en: module };
                const isOpen = openModules.includes(module);
                const blockedCount = perms.filter(p => blockedIds.has(p.id)).length;

                return (
                  <Collapsible key={module} open={isOpen} onOpenChange={() => {
                    setOpenModules(prev => prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]);
                  }}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between h-11 px-3 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium">{isRTL ? label.ar : label.en}</span>
                          <Badge variant="secondary" className="text-xs">{perms.length}</Badge>
                        </div>
                        {blockedCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {blockedCount} {isRTL ? "محظور" : "blocked"}
                          </Badge>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-1 ps-6 pe-2 pb-2">
                        {perms.map(perm => {
                          const isAllowed = !blockedIds.has(perm.id);
                          return (
                            <div
                              key={perm.id}
                              className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${
                                !isAllowed ? "bg-destructive/5 border border-destructive/20" : "hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {isRTL ? (perm.description_ar || perm.description) : perm.description}
                                </p>
                                <span className="text-xs text-muted-foreground font-mono">{perm.code}</span>
                              </div>
                              <Switch checked={isAllowed} onCheckedChange={() => togglePermission(perm.id)} />
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <Separator />

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {isRTL ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagePermissionsDialog;
