import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Save, Loader2 } from "lucide-react";

const DEPRECIATION_METHODS = [
  { value: "straight_line", labelAr: "القسط الثابت", labelEn: "Straight Line" },
  { value: "declining_balance", labelAr: "القسط المتناقص", labelEn: "Declining Balance" },
  { value: "units_of_production", labelAr: "وحدات الإنتاج", labelEn: "Units of Production" },
];

const STATUS_OPTIONS = [
  { value: "active", labelAr: "نشط", labelEn: "Active" },
  { value: "under_maintenance", labelAr: "تحت الصيانة", labelEn: "Under Maintenance" },
  { value: "inactive", labelAr: "غير نشط", labelEn: "Inactive" },
  { value: "disposed", labelAr: "تم التخلص", labelEn: "Disposed" },
];

const CreateFixedAsset = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    asset_code: "",
    barcode: "",
    name: "",
    name_en: "",
    description: "",
    category_id: "",
    branch_id: "",
    purchase_date: new Date().toISOString().split("T")[0],
    purchase_cost: "",
    salvage_value: "0",
    useful_life_months: "60",
    depreciation_method: "straight_line",
    status: "active",
    location: "",
    serial_number: "",
    warranty_expiry: "",
    notes: "",
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["asset-categories", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("asset_categories")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("branches")
        .select("id, name, name_en")
        .eq("company_id", companyId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch existing asset for edit
  const { data: existingAsset } = useQuery({
    queryKey: ["fixed-asset", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fixed_assets")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (existingAsset) {
      setForm({
        asset_code: existingAsset.asset_code || "",
        barcode: existingAsset.barcode || "",
        name: existingAsset.name || "",
        name_en: existingAsset.name_en || "",
        description: existingAsset.description || "",
        category_id: existingAsset.category_id || "",
        branch_id: existingAsset.branch_id || "",
        purchase_date: existingAsset.purchase_date || "",
        purchase_cost: String(existingAsset.purchase_cost || ""),
        salvage_value: String(existingAsset.salvage_value || "0"),
        useful_life_months: String(existingAsset.useful_life_months || "60"),
        depreciation_method: existingAsset.depreciation_method || "straight_line",
        status: existingAsset.status || "active",
        location: existingAsset.location || "",
        serial_number: existingAsset.serial_number || "",
        warranty_expiry: existingAsset.warranty_expiry || "",
        notes: existingAsset.notes || "",
      });
    }
  }, [existingAsset]);

  // Auto-generate code
  useEffect(() => {
    if (!isEdit && companyId && !form.asset_code) {
      (supabase as any)
        .from("fixed_assets")
        .select("asset_code")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data }: any) => {
          if (data?.[0]?.asset_code) {
            const num = parseInt(data[0].asset_code.replace(/\D/g, "")) || 0;
            setForm(f => ({ ...f, asset_code: `FA-${String(num + 1).padStart(4, "0")}` }));
          } else {
            setForm(f => ({ ...f, asset_code: "FA-0001" }));
          }
        });
    }
  }, [companyId, isEdit]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId,
        asset_code: form.asset_code,
        barcode: form.barcode || null,
        name: form.name,
        name_en: form.name_en || null,
        description: form.description || null,
        category_id: form.category_id || null,
        branch_id: form.branch_id || null,
        purchase_date: form.purchase_date,
        purchase_cost: parseFloat(form.purchase_cost),
        salvage_value: parseFloat(form.salvage_value) || 0,
        useful_life_months: parseInt(form.useful_life_months) || 60,
        depreciation_method: form.depreciation_method,
        status: form.status,
        location: form.location || null,
        serial_number: form.serial_number || null,
        warranty_expiry: form.warranty_expiry || null,
        notes: form.notes || null,
      };

      if (isEdit) {
        const { error } = await (supabase as any).from("fixed_assets").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("fixed_assets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast({ title: isRTL ? (isEdit ? "تم تحديث الأصل" : "تم إضافة الأصل") : (isEdit ? "Asset updated" : "Asset created") });
      navigate("/client/assets");
    },
    onError: (err: Error) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: err.message, variant: "destructive" });
    },
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/assets")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isRTL ? (isEdit ? "تعديل أصل" : "إضافة أصل جديد") : (isEdit ? "Edit Asset" : "Add New Asset")}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "البيانات الأساسية" : "Basic Information"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "كود الأصل" : "Asset Code"}</Label>
                <Input value={form.asset_code} onChange={e => setForm(f => ({ ...f, asset_code: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الباركود" : "Barcode"}</Label>
                <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الأصل (عربي)" : "Asset Name (Arabic)"}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الأصل (إنجليزي)" : "Asset Name (English)"}</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "التصنيف" : "Category"}</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر التصنيف" : "Select category"} /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{isRTL ? c.name : (c.name_en || c.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الفرع" : "Branch"}</Label>
                <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الفرع" : "Select branch"} /></SelectTrigger>
                  <SelectContent>
                    {branches?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : (b.name_en || b.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الموقع" : "Location"}</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الرقم التسلسلي" : "Serial Number"}</Label>
                <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{isRTL ? s.labelAr : s.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "البيانات المالية والإهلاك" : "Financial & Depreciation"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ الشراء" : "Purchase Date"}</Label>
                <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تكلفة الشراء" : "Purchase Cost"}</Label>
                <Input type="number" value={form.purchase_cost} onChange={e => setForm(f => ({ ...f, purchase_cost: e.target.value }))} dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "قيمة الخردة" : "Salvage Value"}</Label>
                <Input type="number" value={form.salvage_value} onChange={e => setForm(f => ({ ...f, salvage_value: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "العمر الافتراضي (أشهر)" : "Useful Life (months)"}</Label>
                <Input type="number" value={form.useful_life_months} onChange={e => setForm(f => ({ ...f, useful_life_months: e.target.value }))} dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "طريقة الإهلاك" : "Depreciation Method"}</Label>
              <Select value={form.depreciation_method} onValueChange={v => setForm(f => ({ ...f, depreciation_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPRECIATION_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{isRTL ? m.labelAr : m.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "انتهاء الضمان" : "Warranty Expiry"}</Label>
              <Input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))} dir="ltr" />
            </div>

            {/* Depreciation Preview */}
            {form.purchase_cost && (
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-sm">{isRTL ? "معاينة الإهلاك" : "Depreciation Preview"}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">{isRTL ? "القيمة القابلة للإهلاك:" : "Depreciable Amount:"}</span>
                    <span className="font-medium">
                      {(parseFloat(form.purchase_cost) - parseFloat(form.salvage_value || "0")).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">{isRTL ? "الإهلاك الشهري:" : "Monthly Depreciation:"}</span>
                    <span className="font-medium">
                      {((parseFloat(form.purchase_cost) - parseFloat(form.salvage_value || "0")) / (parseInt(form.useful_life_months) || 60)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-muted-foreground">{isRTL ? "الإهلاك السنوي:" : "Annual Depreciation:"}</span>
                    <span className="font-medium">
                      {(((parseFloat(form.purchase_cost) - parseFloat(form.salvage_value || "0")) / (parseInt(form.useful_life_months) || 60)) * 12).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <Button variant="outline" onClick={() => navigate("/client/assets")}>
          {isRTL ? "إلغاء" : "Cancel"}
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!form.name || !form.purchase_cost || !form.purchase_date || saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          {isRTL ? (isEdit ? "تحديث" : "حفظ") : (isEdit ? "Update" : "Save")}
        </Button>
      </div>
    </div>
  );
};

export default CreateFixedAsset;
