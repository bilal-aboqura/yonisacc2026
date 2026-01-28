import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";

interface Feature {
  id: string;
  icon: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

const iconOptions = [
  "FileText", "Package", "Calculator", "Users", "BarChart3", 
  "UserCheck", "Building2", "Shield", "CreditCard", "Globe",
  "Clock", "Zap", "Lock", "Settings", "TrendingUp"
];

const colorOptions = [
  { value: "from-blue-500 to-blue-600", label: "Blue" },
  { value: "from-green-500 to-green-600", label: "Green" },
  { value: "from-amber-500 to-amber-600", label: "Amber" },
  { value: "from-purple-500 to-purple-600", label: "Purple" },
  { value: "from-pink-500 to-pink-600", label: "Pink" },
  { value: "from-cyan-500 to-cyan-600", label: "Cyan" },
  { value: "from-orange-500 to-orange-600", label: "Orange" },
  { value: "from-red-500 to-red-600", label: "Red" },
];

export const FeaturesManager = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Feature>>({});

  const { data: features, isLoading } = useQuery({
    queryKey: ["landing-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_features")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data as Feature[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Feature>) => {
      if (editingFeature) {
        const { error } = await supabase
          .from("landing_features")
          .update(data)
          .eq("id", editingFeature.id);
        if (error) throw error;
      } else {
        const insertData = {
          icon: data.icon || "FileText",
          title_ar: data.title_ar || "",
          title_en: data.title_en || "",
          description_ar: data.description_ar || "",
          description_en: data.description_en || "",
          color: data.color,
          is_active: data.is_active,
          sort_order: (features?.length || 0) + 1,
        };
        const { error } = await supabase
          .from("landing_features")
          .insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-features"] });
      setIsDialogOpen(false);
      setEditingFeature(null);
      setFormData({});
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ الميزة بنجاح" : "Feature saved successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_features").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-features"] });
      toast({
        title: isRTL ? "تم الحذف" : "Deleted",
        description: isRTL ? "تم حذف الميزة بنجاح" : "Feature deleted successfully",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("landing_features")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-features"] });
    },
  });

  const openEditDialog = (feature: Feature) => {
    setEditingFeature(feature);
    setFormData(feature);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingFeature(null);
    setFormData({ 
      icon: "FileText", 
      color: "from-blue-500 to-blue-600",
      is_active: true 
    });
    setIsDialogOpen(true);
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {isRTL ? "قائمة المميزات" : "Features List"}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="gradient-primary text-white">
              <Plus className="h-4 w-4 me-2" />
              {isRTL ? "إضافة ميزة" : "Add Feature"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFeature 
                  ? (isRTL ? "تعديل الميزة" : "Edit Feature")
                  : (isRTL ? "إضافة ميزة جديدة" : "Add New Feature")
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الأيقونة" : "Icon"}</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={formData.icon || ""}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اللون" : "Color"}</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={formData.color || ""}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  >
                    {colorOptions.map((color) => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                  <Input
                    value={formData.title_ar || ""}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                  <Input
                    value={formData.title_en || ""}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Textarea
                    value={formData.description_ar || ""}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    dir="rtl"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Textarea
                    value={formData.description_en || ""}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    dir="ltr"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending}
                  className="gradient-primary text-white"
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {isRTL ? "حفظ" : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {features?.map((feature) => (
          <Card key={feature.id} className="relative">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white font-bold`}>
                {feature.icon.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{isRTL ? feature.title_ar : feature.title_en}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {isRTL ? feature.description_ar : feature.description_en}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={feature.is_active}
                  onCheckedChange={(checked) => 
                    toggleActiveMutation.mutate({ id: feature.id, is_active: checked })
                  }
                />
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(feature)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(feature.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
