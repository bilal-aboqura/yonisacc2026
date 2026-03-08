import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Upload, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PrintSettings, defaultPrintSettings, CompanyInfo, PrintableDocument } from "@/components/print/types";
import { PrintLayout } from "@/components/print/PrintLayout";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

const templateOptions = [
  { value: "classic", label: "كلاسيكي", labelEn: "Classic", plan: "free" },
  { value: "minimal", label: "مبسط", labelEn: "Minimal", plan: "basic" },
  { value: "modern", label: "عصري", labelEn: "Modern", plan: "pro" },
  { value: "government", label: "حكومي", labelEn: "Government", plan: "enterprise" },
];

const fontOptions = [
  { value: "default", label: "افتراضي" },
  { value: "serif", label: "كلاسيكي (Serif)" },
  { value: "mono", label: "ثابت العرض" },
  { value: "arabic", label: "عربي تقليدي" },
];

// Sample preview document
const sampleDoc: PrintableDocument = {
  title: "قيد محاسبي",
  subtitle: "Journal Entry",
  number: "JE-000012",
  date: "2026-02-25",
  extraFields: [
    { label: "الحالة", value: "مرحّل" },
    { label: "البيان", value: "سند قبض - تحصيل من العميل" },
  ],
  table: {
    headers: ["#", "رمز الحساب", "اسم الحساب", "مدين", "دائن"],
    rows: [
      [1, "11101", "الصندوق", 5000, 0],
      [2, "112101", "العملاء - شركة الأمل", 0, 5000],
    ],
    totals: ["", "", "الإجمالي", 5000, 5000],
  },
};

interface PrintSettingsTabProps {
  companyId: string;
}

const PrintSettingsTab = ({ companyId }: PrintSettingsTabProps) => {
  const { isRTL } = useLanguage();
  const { settings, isLoading, save, isSaving } = usePrintSettings(companyId);

  const [local, setLocal] = useState<PrintSettings>(defaultPrintSettings);

  const { data: company } = useQuery({
    queryKey: ["print-company-info", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("name, name_en, logo_url, tax_number, commercial_register, address, phone, email").eq("id", companyId).single();
      return data as CompanyInfo;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const handleChange = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const queryClient = useQueryClient();

  const handleSave = () => {
    save(local, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["print-settings"] });
        toast.success(isRTL ? "تم حفظ إعدادات الطباعة" : "Print settings saved");
      },
      onError: () => toast.error(isRTL ? "فشل في الحفظ" : "Failed to save"),
    });
  };

  const handleFileUpload = async (field: "signature_url" | "letterhead_file_url", file: File) => {
    const path = `${companyId}/${field}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("print-assets").upload(path, file);
    if (error) {
      toast.error(isRTL ? "فشل رفع الملف" : "Upload failed");
      return;
    }
    const { data: urlData } = supabase.storage.from("print-assets").getPublicUrl(path);
    handleChange(field, urlData.publicUrl);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          {/* Template Style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "نمط القالب" : "Template Style"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {templateOptions.map((t) => (
                  <Button
                    key={t.value}
                    variant={local.template_style === t.value ? "default" : "outline"}
                    className="justify-start gap-2"
                    onClick={() => handleChange("template_style", t.value as any)}
                  >
                    {isRTL ? t.label : t.labelEn}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Toggles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "عناصر الطباعة" : "Print Elements"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                ["show_logo", "إظهار الشعار", "Show Logo"],
                ["show_tax_number", "إظهار الرقم الضريبي", "Show Tax Number"],
                ["show_commercial_register", "إظهار السجل التجاري", "Show CR"],
                ["show_opening_balance", "إظهار الرصيد الافتتاحي", "Show Opening Balance"],
                ["show_footer", "إظهار التذييل", "Show Footer"],
                ["show_signature", "إظهار التوقيع", "Show Signature"],
              ] as const).map(([key, ar, en]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{isRTL ? ar : en}</Label>
                  <Switch
                    checked={local[key] as boolean}
                    onCheckedChange={(v) => handleChange(key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Colors & Font */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "التخصيص" : "Customization"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isRTL ? "اللون الأساسي" : "Primary Color"}</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={local.primary_color}
                    onChange={(e) => handleChange("primary_color", e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={local.primary_color}
                    onChange={(e) => handleChange("primary_color", e.target.value)}
                    className="font-mono flex-1"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الخط" : "Font"}</Label>
                <Select value={local.font_family} onValueChange={(v) => handleChange("font_family", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Footer Text */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "نص التذييل" : "Footer Text"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={local.footer_text}
                onChange={(e) => handleChange("footer_text", e.target.value)}
                placeholder={isRTL ? "نص التذييل المخصص..." : "Custom footer text..."}
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Signature Upload */}
          {local.show_signature && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{isRTL ? "صورة التوقيع" : "Signature Image"}</CardTitle>
              </CardHeader>
              <CardContent>
                {local.signature_url ? (
                  <div className="flex items-center gap-4">
                    <img src={local.signature_url} alt="Signature" className="h-12 border rounded p-1" />
                    <Button variant="outline" size="sm" onClick={() => handleChange("signature_url", null)}>
                      {isRTL ? "إزالة" : "Remove"}
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    <Upload className="h-4 w-4" />
                    {isRTL ? "رفع صورة التوقيع" : "Upload signature image"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload("signature_url", f);
                    }} />
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {/* Margins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "الهوامش (مم)" : "Margins (mm)"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["top_offset", "أعلى", "Top"],
                  ["bottom_offset", "أسفل", "Bottom"],
                  ["left_offset", "يسار", "Left"],
                  ["right_offset", "يمين", "Right"],
                ] as const).map(([key, ar, en]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{isRTL ? ar : en}</Label>
                    <Input
                      type="number" min="0" max="50"
                      value={local[key]}
                      onChange={(e) => handleChange(key, Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            <Save className="h-4 w-4 me-2" />
            {isRTL ? "حفظ إعدادات الطباعة" : "Save Print Settings"}
          </Button>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">{isRTL ? "معاينة مباشرة" : "Live Preview"}</h3>
          </div>
          <div className="border rounded-lg bg-white p-4 shadow-sm overflow-auto" style={{ maxHeight: "80vh" }}>
            <PrintLayout
              settings={local}
              company={company || { name: "شركة تجريبية", name_en: "Sample Company" }}
              document={sampleDoc}
              isRTL={isRTL}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSettingsTab;
