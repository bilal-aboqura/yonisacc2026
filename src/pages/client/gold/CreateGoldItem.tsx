import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft, Gem, Calculator } from "lucide-react";

const KARATS = ["24k", "22k", "21k", "18k"];
const ITEM_TYPES = [
  { value: "ring", ar: "خاتم", en: "Ring" },
  { value: "necklace", ar: "عقد", en: "Necklace" },
  { value: "bracelet", ar: "سوار", en: "Bracelet" },
  { value: "earring", ar: "حلق", en: "Earring" },
  { value: "chain", ar: "سلسلة", en: "Chain" },
  { value: "pendant", ar: "تعليقة", en: "Pendant" },
  { value: "set", ar: "طقم", en: "Set" },
  { value: "other", ar: "أخرى", en: "Other" },
];

const CreateGoldItem = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", karat: "21k", weight_grams: "", item_type: "ring",
    making_cost: "0", stone_cost: "0", barcode: "",
  });

  // Fetch latest gold price for selected karat
  const { data: goldPrice } = useQuery({
    queryKey: ["gold-price-latest", companyId, form.karat],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("gold_price_settings" as any)
        .select("price_per_gram")
        .eq("company_id", companyId)
        .eq("karat", form.karat)
        .order("price_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.price_per_gram || 0;
    },
    enabled: !!companyId,
  });

  // Load existing item for edit
  useEffect(() => {
    if (isEdit && companyId) {
      supabase.from("gold_items" as any).select("*").eq("id", id).single().then(({ data }) => {
        if (data) setForm({
          name: data.name || "", name_en: data.name_en || "", karat: data.karat || "21k",
          weight_grams: String(data.weight_grams || ""), item_type: data.item_type || "ring",
          making_cost: String(data.making_cost || "0"), stone_cost: String(data.stone_cost || "0"),
          barcode: data.barcode || "",
        });
      });
    }
  }, [isEdit, id, companyId]);

  const weight = parseFloat(form.weight_grams) || 0;
  const pricePerGram = goldPrice || 0;
  const goldCost = weight * pricePerGram;
  const makingCost = parseFloat(form.making_cost) || 0;
  const stoneCost = parseFloat(form.stone_cost) || 0;
  const totalValue = goldCost + makingCost + stoneCost;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      if (!form.name) throw new Error(isRTL ? "الاسم مطلوب" : "Name is required");
      if (weight <= 0) throw new Error(isRTL ? "الوزن مطلوب" : "Weight is required");

      // Create/update linked product record
      let productId: string | null = null;
      if (!isEdit) {
        const sku = `GOLD-${Date.now().toString(36).toUpperCase()}`;
        const { data: prod, error: prodErr } = await supabase.from("products").insert({
          company_id: companyId,
          name: form.name,
          name_en: form.name_en || null,
          sku,
          barcode: form.barcode || null,
          purchase_price: totalValue,
          sale_price: totalValue,
          is_service: false,
          product_type: "stock",
        }).select("id").single();
        if (prodErr) throw prodErr;
        productId = prod.id;
      }

      const payload: any = {
        company_id: companyId,
        name: form.name,
        name_en: form.name_en || null,
        karat: form.karat,
        weight_grams: weight,
        item_type: form.item_type,
        making_cost: makingCost,
        stone_cost: stoneCost,
        gold_cost: goldCost,
        barcode: form.barcode || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase.from("gold_items" as any).update(payload).eq("id", id);
        if (error) throw error;
      } else {
        payload.product_id = productId;
        const { error } = await supabase.from("gold_items" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
      queryClient.invalidateQueries({ queryKey: ["gold-items"] });
      navigate("/client/gold/items");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/gold/items")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل صنف ذهب" : "Edit Gold Item") : (isRTL ? "إضافة صنف ذهب" : "Add Gold Item")}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-amber-500" />
            {isRTL ? "بيانات الصنف" : "Item Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "الاسم (عربي)" : "Name (Arabic)"} *</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</label>
              <Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "العيار" : "Karat"} *</label>
              <Select value={form.karat} onValueChange={(v) => setForm(f => ({ ...f, karat: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KARATS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "الوزن (جرام)" : "Weight (grams)"} *</label>
              <Input type="number" step="0.01" value={form.weight_grams} onChange={(e) => setForm(f => ({ ...f, weight_grams: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "نوع القطعة" : "Item Type"}</label>
              <Select value={form.item_type} onValueChange={(v) => setForm(f => ({ ...f, item_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{isRTL ? t.ar : t.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "الباركود" : "Barcode"}</label>
              <Input value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "تكلفة المصنعية" : "Making Cost"}</label>
              <Input type="number" step="0.01" value={form.making_cost} onChange={(e) => setForm(f => ({ ...f, making_cost: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "تكلفة الأحجار" : "Stone Cost"}</label>
              <Input type="number" step="0.01" value={form.stone_cost} onChange={(e) => setForm(f => ({ ...f, stone_cost: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Calculation Card */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Calculator className="h-5 w-5" />
            {isRTL ? "حساب السعر" : "Price Calculation"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{isRTL ? "سعر الجرام" : "Price/gram"}</p>
              <p className="text-lg font-bold">{pricePerGram.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{isRTL ? "تكلفة الذهب" : "Gold Cost"}</p>
              <p className="text-lg font-bold">{goldCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{isRTL ? "المصنعية + الأحجار" : "Making + Stones"}</p>
              <p className="text-lg font-bold">{(makingCost + stoneCost).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p>
              <p className="text-2xl font-bold text-amber-700">{totalValue.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {isRTL
              ? `المعادلة: (${weight.toFixed(2)} جرام × ${pricePerGram.toFixed(2)} سعر الجرام) + ${makingCost.toFixed(2)} مصنعية + ${stoneCost.toFixed(2)} أحجار = ${totalValue.toFixed(2)}`
              : `Formula: (${weight.toFixed(2)}g × ${pricePerGram.toFixed(2)} price/g) + ${makingCost.toFixed(2)} making + ${stoneCost.toFixed(2)} stones = ${totalValue.toFixed(2)}`}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
          <Save className="h-4 w-4 me-2" />
          {saveMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
        </Button>
        <Button variant="outline" onClick={() => navigate("/client/gold/items")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
      </div>
    </div>
  );
};

export default CreateGoldItem;
