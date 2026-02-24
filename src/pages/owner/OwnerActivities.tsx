import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Eye, EyeOff, Clock, CheckCircle, Monitor } from "lucide-react";
import {
  Gem, Car, ShoppingCart, Scissors, Sparkles,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import VerticalScreensDialog from "@/components/owner/VerticalScreensDialog";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gem, Car, ShoppingCart, Scissors, Sparkles,
  Stethoscope, Pill, Building2, UtensilsCrossed, Store,
};

interface BusinessVertical {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  color: string;
  monthly_price: number;
  yearly_price: number;
  features_ar: string[];
  features_en: string[];
  status: string;
  sort_order: number;
  is_active: boolean;
}

const OwnerActivities = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<BusinessVertical | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [screensVertical, setScreensVertical] = useState<BusinessVertical | null>(null);
  const [screensDialogOpen, setScreensDialogOpen] = useState(false);

  const { data: verticals, isLoading } = useQuery({
    queryKey: ["owner-business-verticals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_verticals" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as BusinessVertical[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (item: Partial<BusinessVertical> & { id: string }) => {
      const { id, ...updates } = item;
      const { error } = await supabase
        .from("business_verticals" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-business-verticals"] });
      toast({ title: isRTL ? "تم التحديث بنجاح" : "Updated successfully" });
    },
    onError: () => {
      toast({ title: isRTL ? "حدث خطأ" : "Error occurred", variant: "destructive" });
    },
  });

  const toggleStatus = (item: BusinessVertical) => {
    updateMutation.mutate({
      id: item.id,
      status: item.status === "coming_soon" ? "active" : "coming_soon",
    });
  };

  const toggleVisibility = (item: BusinessVertical) => {
    updateMutation.mutate({
      id: item.id,
      is_active: !item.is_active,
    });
  };

  const handleSave = () => {
    if (!editItem) return;
    updateMutation.mutate(editItem, {
      onSuccess: () => {
        setDialogOpen(false);
        setEditItem(null);
        queryClient.invalidateQueries({ queryKey: ["owner-business-verticals"] });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isRTL ? "إدارة الأنشطة" : "Activities Management"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? "إدارة الأنشطة المتخصصة وحالتها وأسعارها" : "Manage business verticals, status, and pricing"}
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "النشاط" : "Activity"}</TableHead>
                  <TableHead>{isRTL ? "السعر الشهري" : "Monthly"}</TableHead>
                  <TableHead>{isRTL ? "السعر السنوي" : "Yearly"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "الظهور" : "Visible"}</TableHead>
                  <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {isRTL ? "جاري التحميل..." : "Loading..."}
                    </TableCell>
                  </TableRow>
                ) : verticals?.map((item) => {
                  const IconComp = iconMap[item.icon] || Store;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0",
                            item.color
                          )}>
                            <IconComp className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{isRTL ? item.name_ar : item.name_en}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {isRTL ? item.description_ar : item.description_en}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.monthly_price} {isRTL ? "ر.س" : "SAR"}</TableCell>
                      <TableCell>{item.yearly_price} {isRTL ? "ر.س" : "SAR"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "cursor-pointer gap-1",
                            item.status === "active"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          )}
                          onClick={() => toggleStatus(item)}
                        >
                          {item.status === "active" ? (
                            <><CheckCircle className="h-3 w-3" /> {isRTL ? "مفعّل" : "Active"}</>
                          ) : (
                            <><Clock className="h-3 w-3" /> {isRTL ? "قريباً" : "Coming Soon"}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(item)}
                          className={cn(!item.is_active && "text-muted-foreground")}
                        >
                          {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={isRTL ? "الشاشات" : "Screens"}
                            onClick={() => { setScreensVertical({ ...item }); setScreensDialogOpen(true); }}
                          >
                            <Monitor className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={isRTL ? "تعديل" : "Edit"}
                            onClick={() => { setEditItem({ ...item }); setDialogOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "تعديل النشاط" : "Edit Activity"}
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                  <Input
                    value={editItem.name_ar}
                    onChange={(e) => setEditItem({ ...editItem, name_ar: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                  <Input
                    value={editItem.name_en}
                    onChange={(e) => setEditItem({ ...editItem, name_en: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Textarea
                    value={editItem.description_ar}
                    onChange={(e) => setEditItem({ ...editItem, description_ar: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Textarea
                    value={editItem.description_en}
                    onChange={(e) => setEditItem({ ...editItem, description_en: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "السعر الشهري" : "Monthly Price"}</Label>
                  <Input
                    type="number"
                    value={editItem.monthly_price}
                    onChange={(e) => setEditItem({ ...editItem, monthly_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "السعر السنوي" : "Yearly Price"}</Label>
                  <Input
                    type="number"
                    value={editItem.yearly_price}
                    onChange={(e) => setEditItem({ ...editItem, yearly_price: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الأيقونة" : "Icon"}</Label>
                  <Input
                    value={editItem.icon}
                    onChange={(e) => setEditItem({ ...editItem, icon: e.target.value })}
                    placeholder="Store, Gem, Car..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الترتيب" : "Sort Order"}</Label>
                  <Input
                    type="number"
                    value={editItem.sort_order}
                    onChange={(e) => setEditItem({ ...editItem, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "المميزات (عربي) - سطر لكل ميزة" : "Features (Arabic) - one per line"}</Label>
                <Textarea
                  value={editItem.features_ar?.join("\n") || ""}
                  onChange={(e) => setEditItem({ ...editItem, features_ar: e.target.value.split("\n").filter(Boolean) })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "المميزات (إنجليزي) - سطر لكل ميزة" : "Features (English) - one per line"}</Label>
                <Textarea
                  value={editItem.features_en?.join("\n") || ""}
                  onChange={(e) => setEditItem({ ...editItem, features_en: e.target.value.split("\n").filter(Boolean) })}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vertical Screens Dialog */}
      <VerticalScreensDialog
        open={screensDialogOpen}
        onOpenChange={setScreensDialogOpen}
        vertical={screensVertical}
      />
    </div>
  );
};

export default OwnerActivities;
