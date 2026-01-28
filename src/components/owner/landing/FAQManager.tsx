import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Loader2, GripVertical, HelpCircle } from "lucide-react";

interface FAQ {
  id: string;
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
  sort_order: number;
  is_active: boolean;
}

export const FAQManager = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<FAQ>>({});

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["landing-faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_faq")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data as FAQ[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<FAQ>) => {
      if (editingFAQ) {
        const { error } = await supabase
          .from("landing_faq")
          .update(data)
          .eq("id", editingFAQ.id);
        if (error) throw error;
      } else {
        const insertData = {
          question_ar: data.question_ar || "",
          question_en: data.question_en || "",
          answer_ar: data.answer_ar || "",
          answer_en: data.answer_en || "",
          is_active: data.is_active,
          sort_order: (faqs?.length || 0) + 1,
        };
        const { error } = await supabase
          .from("landing_faq")
          .insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-faq"] });
      setIsDialogOpen(false);
      setEditingFAQ(null);
      setFormData({});
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ السؤال بنجاح" : "FAQ saved successfully",
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
      const { error } = await supabase.from("landing_faq").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-faq"] });
      toast({
        title: isRTL ? "تم الحذف" : "Deleted",
        description: isRTL ? "تم حذف السؤال بنجاح" : "FAQ deleted successfully",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("landing_faq")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-faq"] });
    },
  });

  const openEditDialog = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData(faq);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingFAQ(null);
    setFormData({ is_active: true });
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
          {isRTL ? "الأسئلة الشائعة" : "FAQ List"}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="gradient-primary text-white">
              <Plus className="h-4 w-4 me-2" />
              {isRTL ? "إضافة سؤال" : "Add FAQ"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFAQ 
                  ? (isRTL ? "تعديل السؤال" : "Edit FAQ")
                  : (isRTL ? "إضافة سؤال جديد" : "Add New FAQ")
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "السؤال (عربي)" : "Question (Arabic)"}</Label>
                  <Input
                    value={formData.question_ar || ""}
                    onChange={(e) => setFormData({ ...formData, question_ar: e.target.value })}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "السؤال (إنجليزي)" : "Question (English)"}</Label>
                  <Input
                    value={formData.question_en || ""}
                    onChange={(e) => setFormData({ ...formData, question_en: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "الإجابة (عربي)" : "Answer (Arabic)"}</Label>
                  <Textarea
                    value={formData.answer_ar || ""}
                    onChange={(e) => setFormData({ ...formData, answer_ar: e.target.value })}
                    dir="rtl"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الإجابة (إنجليزي)" : "Answer (English)"}</Label>
                  <Textarea
                    value={formData.answer_en || ""}
                    onChange={(e) => setFormData({ ...formData, answer_en: e.target.value })}
                    dir="ltr"
                    rows={4}
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
        {faqs?.map((faq, index) => (
          <Card key={faq.id}>
            <CardContent className="flex items-start gap-4 p-4">
              <div className="cursor-grab mt-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="font-semibold truncate">
                    {isRTL ? faq.question_ar : faq.question_en}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {isRTL ? faq.answer_ar : faq.answer_en}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  checked={faq.is_active}
                  onCheckedChange={(checked) => 
                    toggleActiveMutation.mutate({ id: faq.id, is_active: checked })
                  }
                />
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(faq)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(faq.id)}
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
