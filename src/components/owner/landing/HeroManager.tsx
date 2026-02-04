import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";

interface HeroContent {
  id: string;
  title_ar: string;
  title_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  badge_ar: string | null;
  badge_en: string | null;
  cta_text_ar: string;
  cta_text_en: string;
  demo_text_ar: string | null;
  demo_text_en: string | null;
  stat1_value: string | null;
  stat1_label_ar: string | null;
  stat1_label_en: string | null;
  stat2_value: string | null;
  stat2_label_ar: string | null;
  stat2_label_en: string | null;
  stat3_value: string | null;
  stat3_label_ar: string | null;
  stat3_label_en: string | null;
  video_url: string | null;
}

export const HeroManager = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const { data: hero, isLoading } = useQuery({
    queryKey: ["landing-hero"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_hero")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as HeroContent | null;
    },
  });

  const [formData, setFormData] = useState<Partial<HeroContent>>({});

  const displayData = { ...hero, ...formData };

  const mutation = useMutation({
    mutationFn: async (data: Partial<HeroContent>) => {
      if (!hero?.id) return;
      const { error } = await supabase
        .from("landing_hero")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", hero.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-hero"] });
      setFormData({});
      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم حفظ التغييرات بنجاح" : "Changes saved successfully",
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

  const handleChange = (field: keyof HeroContent, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (Object.keys(formData).length > 0) {
      mutation.mutate(formData);
    }
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
      {/* Title Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "العنوان والوصف" : "Title & Description"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
              <Input
                value={displayData.title_ar || ""}
                onChange={(e) => handleChange("title_ar", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
              <Input
                value={displayData.title_en || ""}
                onChange={(e) => handleChange("title_en", e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الوصف (عربي)" : "Subtitle (Arabic)"}</Label>
              <Textarea
                value={displayData.subtitle_ar || ""}
                onChange={(e) => handleChange("subtitle_ar", e.target.value)}
                dir="rtl"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الوصف (إنجليزي)" : "Subtitle (English)"}</Label>
              <Textarea
                value={displayData.subtitle_en || ""}
                onChange={(e) => handleChange("subtitle_en", e.target.value)}
                dir="ltr"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "الشارة" : "Badge"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الشارة (عربي)" : "Badge (Arabic)"}</Label>
              <Input
                value={displayData.badge_ar || ""}
                onChange={(e) => handleChange("badge_ar", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الشارة (إنجليزي)" : "Badge (English)"}</Label>
              <Input
                value={displayData.badge_en || ""}
                onChange={(e) => handleChange("badge_en", e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "أزرار الدعوة للعمل" : "CTA Buttons"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "زر البدء (عربي)" : "CTA Button (Arabic)"}</Label>
              <Input
                value={displayData.cta_text_ar || ""}
                onChange={(e) => handleChange("cta_text_ar", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "زر البدء (إنجليزي)" : "CTA Button (English)"}</Label>
              <Input
                value={displayData.cta_text_en || ""}
                onChange={(e) => handleChange("cta_text_en", e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "زر العرض التوضيحي (عربي)" : "Demo Button (Arabic)"}</Label>
              <Input
                value={displayData.demo_text_ar || ""}
                onChange={(e) => handleChange("demo_text_ar", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "زر العرض التوضيحي (إنجليزي)" : "Demo Button (English)"}</Label>
              <Input
                value={displayData.demo_text_en || ""}
                onChange={(e) => handleChange("demo_text_en", e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video URL Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "فيديو يوتيوب" : "YouTube Video"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isRTL ? "رابط الفيديو" : "Video URL"}</Label>
            <Input
              value={displayData.video_url || ""}
              onChange={(e) => handleChange("video_url", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              {isRTL 
                ? "أدخل رابط يوتيوب عادي أو رابط embed. الفيديو سيشتغل تلقائياً مع كتم الصوت."
                : "Enter a YouTube URL or embed link. Video will autoplay muted."
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "الإحصائيات" : "Statistics"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((num) => (
            <div key={num} className="grid md:grid-cols-3 gap-4 pb-4 border-b last:border-0">
              <div className="space-y-2">
                <Label>{isRTL ? `القيمة ${num}` : `Value ${num}`}</Label>
                <Input
                  value={(displayData as any)[`stat${num}_value`] || ""}
                  onChange={(e) => handleChange(`stat${num}_value` as keyof HeroContent, e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? `التسمية (عربي) ${num}` : `Label (Arabic) ${num}`}</Label>
                <Input
                  value={(displayData as any)[`stat${num}_label_ar`] || ""}
                  onChange={(e) => handleChange(`stat${num}_label_ar` as keyof HeroContent, e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? `التسمية (إنجليزي) ${num}` : `Label (English) ${num}`}</Label>
                <Input
                  value={(displayData as any)[`stat${num}_label_en`] || ""}
                  onChange={(e) => handleChange(`stat${num}_label_en` as keyof HeroContent, e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={Object.keys(formData).length === 0 || mutation.isPending}
          className="gradient-primary text-white"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Save className="h-4 w-4 me-2" />
          )}
          {isRTL ? "حفظ التغييرات" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
