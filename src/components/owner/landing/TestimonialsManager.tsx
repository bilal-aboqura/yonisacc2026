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
import { Plus, Pencil, Trash2, Loader2, Star, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  company: string | null;
  content_ar: string;
  content_en: string;
  rating: number | null;
  avatar_url: string | null;
  is_active: boolean;
}

export const TestimonialsManager = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Testimonial>>({});

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["testimonials-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Testimonial>) => {
      if (editingTestimonial) {
        const { error } = await supabase
          .from("testimonials")
          .update(data)
          .eq("id", editingTestimonial.id);
        if (error) throw error;
      } else {
        const insertData = {
          name: data.name || "",
          company: data.company,
          content_ar: data.content_ar || "",
          content_en: data.content_en || "",
          rating: data.rating,
          is_active: data.is_active,
        };
        const { error } = await supabase
          .from("testimonials")
          .insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials-all"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      setIsDialogOpen(false);
      setEditingTestimonial(null);
      setFormData({});
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ الشهادة بنجاح" : "Testimonial saved successfully",
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
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials-all"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast({
        title: isRTL ? "تم الحذف" : "Deleted",
        description: isRTL ? "تم حذف الشهادة بنجاح" : "Testimonial deleted successfully",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("testimonials")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials-all"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
  });

  const openEditDialog = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData(testimonial);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingTestimonial(null);
    setFormData({ rating: 5, is_active: true });
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
          {isRTL ? "شهادات العملاء" : "Testimonials"}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="gradient-primary text-white">
              <Plus className="h-4 w-4 me-2" />
              {isRTL ? "إضافة شهادة" : "Add Testimonial"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial 
                  ? (isRTL ? "تعديل الشهادة" : "Edit Testimonial")
                  : (isRTL ? "إضافة شهادة جديدة" : "Add New Testimonial")
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم العميل" : "Client Name"}</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الشركة" : "Company"}</Label>
                  <Input
                    value={formData.company || ""}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "التقييم" : "Rating"}</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-1"
                    >
                      <Star 
                        className={`h-6 w-6 ${
                          (formData.rating || 0) >= star 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-gray-300"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "المحتوى (عربي)" : "Content (Arabic)"}</Label>
                  <Textarea
                    value={formData.content_ar || ""}
                    onChange={(e) => setFormData({ ...formData, content_ar: e.target.value })}
                    dir="rtl"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "المحتوى (إنجليزي)" : "Content (English)"}</Label>
                  <Textarea
                    value={formData.content_en || ""}
                    onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials?.map((testimonial) => (
          <Card key={testimonial.id} className="relative">
            <CardContent className="p-4">
              <Quote className="absolute top-4 end-4 h-8 w-8 text-primary/10" />
              
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                "{isRTL ? testimonial.content_ar : testimonial.content_en}"
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{testimonial.name}</h4>
                    <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={testimonial.is_active}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: testimonial.id, is_active: checked })
                    }
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(testimonial)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(testimonial.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
