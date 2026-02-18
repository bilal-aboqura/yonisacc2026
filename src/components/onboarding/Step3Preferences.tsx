import { useOnboarding } from "@/contexts/OnboardingContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";

const CURRENCIES = [
  { code: "SAR", label: "ريال سعودي (SAR)" },
  { code: "AED", label: "درهم إماراتي (AED)" },
  { code: "KWD", label: "دينار كويتي (KWD)" },
  { code: "BHD", label: "دينار بحريني (BHD)" },
  { code: "QAR", label: "ريال قطري (QAR)" },
  { code: "OMR", label: "ريال عماني (OMR)" },
  { code: "USD", label: "دولار أمريكي (USD)" },
  { code: "EUR", label: "يورو (EUR)" },
];

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "الرياض (UTC+3)" },
  { value: "Asia/Dubai", label: "دبي (UTC+4)" },
  { value: "Asia/Kuwait", label: "الكويت (UTC+3)" },
  { value: "Asia/Bahrain", label: "البحرين (UTC+3)" },
  { value: "Asia/Qatar", label: "قطر (UTC+3)" },
  { value: "Africa/Cairo", label: "القاهرة (UTC+2/3)" },
  { value: "Europe/London", label: "لندن (UTC+0/1)" },
  { value: "America/New_York", label: "نيويورك (UTC-5/4)" },
];

interface Props {
  isRTL: boolean;
}

export const Step3Preferences = ({ isRTL }: Props) => {
  const { data, update, goNext, goBack } = useOnboarding();

  const { data: verticals } = useQuery({
    queryKey: ["registration-verticals"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("business_verticals")
        .select("id, name_ar, name_en, status")
        .eq("is_active", true)
        .eq("status", "active")
        .order("sort_order");
      if (error) throw error;
      return (rows || []) as Array<{ id: string; name_ar: string; name_en: string; status: string }>;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {isRTL ? "تفضيلات النظام" : "System Preferences"}
        </CardTitle>
        <CardDescription>
          {isRTL ? "اضبط إعدادات النظام الافتراضية لشركتك" : "Set your company's default system settings"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{isRTL ? "نوع النشاط" : "Industry"}</Label>
            <Select
              value={data.industry || "__general__"}
              onValueChange={(v) => update({ industry: v === "__general__" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={isRTL ? "اختر نوع النشاط" : "Select industry"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__general__">{isRTL ? "تجارة عامة" : "General Trade"}</SelectItem>
                {verticals?.map((v) => (
                  <SelectItem key={v.id} value={v.name_en}>
                    {isRTL ? v.name_ar : v.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? "الدولة" : "Country"}</Label>
            <Select value={data.country} onValueChange={(v) => update({ country: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SA">🇸🇦 المملكة العربية السعودية</SelectItem>
                <SelectItem value="AE">🇦🇪 الإمارات العربية المتحدة</SelectItem>
                <SelectItem value="KW">🇰🇼 الكويت</SelectItem>
                <SelectItem value="BH">🇧🇭 البحرين</SelectItem>
                <SelectItem value="QA">🇶🇦 قطر</SelectItem>
                <SelectItem value="OM">🇴🇲 عُمان</SelectItem>
                <SelectItem value="EG">🇪🇬 مصر</SelectItem>
                <SelectItem value="JO">🇯🇴 الأردن</SelectItem>
                <SelectItem value="OTHER">🌍 أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{isRTL ? "المنطقة الزمنية" : "Timezone"}</Label>
            <Select value={data.timezone} onValueChange={(v) => update({ timezone: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? "العملة الأساسية" : "Base Currency"}</Label>
            <Select value={data.base_currency} onValueChange={(v) => update({ base_currency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{isRTL ? "لغة النظام" : "System Language"}</Label>
          <Select value={data.language} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">🇸🇦 العربية</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={goBack}>{isRTL ? "السابق" : "Back"}</Button>
          <Button onClick={goNext} size="lg">
            {isRTL ? "التالي: اختيار الوحدات" : "Next: Select Modules"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
