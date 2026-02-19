import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Target } from "lucide-react";

const CreateCostCenter = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useTenantIsolation();
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  // Fetch existing cost centers for parent selection
  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, code, name, name_en, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const handleSave = async () => {
    if (!companyId) {
      toast.error(isRTL ? "لم يتم تحديد الشركة" : "Company not found");
      return;
    }
    if (!code.trim()) {
      toast.error(isRTL ? "الرمز مطلوب" : "Code is required");
      return;
    }
    if (!name.trim()) {
      toast.error(isRTL ? "الاسم مطلوب" : "Name is required");
      return;
    }

    // Check unique code
    const { data: existing } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("company_id", companyId)
      .eq("code", code.trim())
      .maybeSingle();

    if (existing) {
      toast.error(isRTL ? "رمز مركز التكلفة مستخدم بالفعل" : "Cost center code already exists");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("cost_centers").insert({
        company_id: companyId,
        code: code.trim(),
        name: name.trim(),
        name_en: nameEn.trim() || null,
        parent_id: parentId || null,
        is_active: isActive,
      });

      if (error) throw error;

      toast.success(isRTL ? "تم إضافة مركز التكلفة بنجاح" : "Cost center created successfully");
      navigate("/client/cost-centers");
    } catch (error: any) {
      toast.error(error.message || (isRTL ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/cost-centers")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isRTL ? "إضافة مركز تكلفة" : "Add Cost Center"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isRTL ? "بيانات مركز التكلفة" : "Cost Center Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code */}
            <div className="space-y-2">
              <Label>{isRTL ? "الرمز" : "Code"} *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={isRTL ? "مثال: CC-001" : "e.g. CC-001"}
              />
            </div>

            {/* Name (Arabic) */}
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRTL ? "اسم مركز التكلفة" : "Cost center name"}
                dir="rtl"
              />
            </div>

            {/* Name (English) */}
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={isRTL ? "الاسم بالإنجليزية" : "English name"}
                dir="ltr"
              />
            </div>

            {/* Parent Cost Center */}
            <div className="space-y-2">
              <Label>{isRTL ? "مركز التكلفة الأب" : "Parent Cost Center"}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "بدون أب" : "No parent"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? "بدون أب" : "No parent"}</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {isRTL ? cc.name : cc.name_en || cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>{isRTL ? "نشط" : "Active"}</Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate("/client/cost-centers")}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 me-2" />
              {saving
                ? (isRTL ? "جاري الحفظ..." : "Saving...")
                : (isRTL ? "حفظ" : "Save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCostCenter;
