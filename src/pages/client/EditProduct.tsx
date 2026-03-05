import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Save, Package, Loader2, Car, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAutoPartsAccess } from "@/hooks/useAutoPartsAccess";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAutoPartsCompany } = useAutoPartsAccess();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [taxRate, setTaxRate] = useState(15);
  const [minStock, setMinStock] = useState(0);
  const [maxStock, setMaxStock] = useState(0);
  const [description, setDescription] = useState("");
  const [isService, setIsService] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [oemNumber, setOemNumber] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [partCondition, setPartCondition] = useState("new");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const [categories, setCategories] = useState<{ id: string; name: string; name_en: string | null }[]>([]);
  const [companyUnits, setCompanyUnits] = useState<{ id: string; name: string; name_en: string | null; symbol: string | null }[]>([]);

  const { data: carBrands } = useQuery({
    queryKey: ["car-brands-edit", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("car_brands").select("*").eq("company_id", companyId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && isAutoPartsCompany,
  });

  const { data: carModels } = useQuery({
    queryKey: ["car-models-edit", companyId, selectedBrand],
    queryFn: async () => {
      const { data, error } = await supabase.from("car_models").select("*").eq("company_id", companyId!).eq("brand_id", selectedBrand).eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!selectedBrand && isAutoPartsCompany,
  });

  useEffect(() => {
    if (user && id) fetchProductData();
  }, [user, id]);

  const fetchProductData = async () => {
    try {
      const resolvedId = await (await import("@/hooks/useCompanyId")).fetchCompanyId(user?.id || "");
      if (!resolvedId) throw new Error("No company found");
      setCompanyId(resolvedId);

      const [{ data: product, error }, { data: cats }, { data: units }] = await Promise.all([
        supabase.from("products").select("*").eq("id", id!).single(),
        supabase.from("product_categories").select("id, name, name_en").eq("company_id", resolvedId).eq("is_active", true).order("name"),
        supabase.from("units").select("id, name, name_en, symbol").eq("company_id", resolvedId).eq("is_active", true).order("name"),
      ]);

      if (error) throw error;
      setCategories(cats || []);
      setCompanyUnits(units || []);

      if (product) {
        setName(product.name || "");
        setNameEn((product as any).name_en || "");
        setSku((product as any).sku || "");
        setBarcode((product as any).barcode || "");
        setCategoryId((product as any).category_id || "");
        setUnit((product as any).unit_id || "");
        setPurchasePrice((product as any).purchase_price || 0);
        setSalePrice((product as any).sale_price || 0);
        setTaxRate((product as any).tax_rate ?? 15);
        setMinStock((product as any).min_stock || 0);
        setMaxStock((product as any).max_stock || 0);
        setDescription((product as any).description || "");
        setIsService((product as any).is_service || false);
        setIsActive((product as any).is_active ?? true);
        setOemNumber((product as any).oem_number || "");
        setShelfLocation((product as any).shelf_location || "");
        setPartCondition((product as any).part_condition || "new");
      }

      // Load car compatibility
      if (isAutoPartsCompany) {
        const { data: compat } = await supabase.from("product_car_compatibility").select("car_model_id").eq("product_id", id!);
        if (compat && compat.length > 0) {
          setSelectedModels(compat.map((c: any) => c.car_model_id));
        }
      }
    } catch (error: any) {
      console.error("Error fetching product:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل بيانات المنتج", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addModel = (modelId: string) => {
    if (!selectedModels.includes(modelId)) setSelectedModels([...selectedModels, modelId]);
  };
  const removeModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter((mid) => mid !== modelId));
  };

  const handleSave = async () => {
    if (!companyId || !id) return;
    if (!name.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المنتج", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("products").update({
        name: name.trim(),
        name_en: nameEn.trim() || null,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        category_id: categoryId || null,
        unit_id: unit || null,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        tax_rate: taxRate,
        min_stock: minStock,
        reorder_level: minStock,
        max_stock: maxStock || null,
        description: description.trim() || null,
        is_service: isService,
        is_active: isActive,
        oem_number: isAutoPartsCompany ? (oemNumber.trim() || null) : undefined,
        shelf_location: isAutoPartsCompany ? (shelfLocation.trim() || null) : undefined,
        part_condition: isAutoPartsCompany ? partCondition : undefined,
      }).eq("id", id);

      if (error) throw error;

      // Update car compatibility
      if (isAutoPartsCompany) {
        await supabase.from("product_car_compatibility").delete().eq("product_id", id);
        if (selectedModels.length > 0) {
          await supabase.from("product_car_compatibility").insert(
            selectedModels.map((modelId) => ({ product_id: id, car_model_id: modelId })) as any
          );
        }
      }

      toast({ title: "تم الحفظ", description: "تم تحديث المنتج بنجاح" });
      navigate(`/client/inventory/product/${id}`);
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({ title: "خطأ", description: "حدث خطأ في حفظ المنتج", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rtl max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/client/inventory/product/${id}`)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">تعديل المنتج</h1>
            <p className="text-muted-foreground">تعديل بيانات المنتج</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          <Save className="h-4 w-4 ml-2" />
          حفظ التعديلات
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />البيانات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المنتج (عربي) *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج بالعربي" />
            </div>
            <div className="space-y-2">
              <Label>اسم المنتج (إنجليزي)</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Product name in English" dir="ltr" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>رمز المنتج (SKU)</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="PRD-001" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>الباركود</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="1234567890123" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue placeholder="اختر الوحدة" /></SelectTrigger>
                <SelectContent>
                  {companyUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} {u.symbol ? `(${u.symbol})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>التصنيف</Label>
            <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون تصنيف</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف المنتج..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Auto Parts */}
      {isAutoPartsCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" />بيانات قطع الغيار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>رقم القطعة الأصلي (OEM)</Label>
                <Input value={oemNumber} onChange={(e) => setOemNumber(e.target.value)} placeholder="OEM-12345" className="font-mono" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>موقع الرف</Label>
                <Input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} placeholder="A-01-03" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>حالة القطعة</Label>
                <Select value={partCondition} onValueChange={setPartCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">جديد</SelectItem>
                    <SelectItem value="used">مستعمل</SelectItem>
                    <SelectItem value="refurbished">مجدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">توافق السيارات</Label>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الماركة</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger><SelectValue placeholder="اختر الماركة" /></SelectTrigger>
                    <SelectContent>
                      {carBrands?.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الموديل</Label>
                  <Select value="" onValueChange={(v) => v && addModel(v)} disabled={!selectedBrand}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="اختر الموديل" /></SelectTrigger>
                    <SelectContent>
                      {carModels?.filter((m: any) => !selectedModels.includes(m.id)).map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedModels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedModels.map((modelId) => {
                    const model = carModels?.find((m: any) => m.id === modelId);
                    const brand = carBrands?.find((b: any) => b.id === selectedBrand);
                    return (
                      <Badge key={modelId} variant="secondary" className="gap-1 px-3 py-1">
                        {(brand as any)?.name} - {(model as any)?.name || modelId}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeModel(modelId)} />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      <Card>
        <CardHeader><CardTitle>الأسعار والضريبة</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>سعر الشراء</Label>
              <Input type="number" min="0" step="0.01" value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Number(e.target.value))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>سعر البيع</Label>
              <Input type="number" min="0" step="0.01" value={salePrice || ""} onChange={(e) => setSalePrice(Number(e.target.value))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>نسبة الضريبة %</Label>
              <Input type="number" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
          </div>
          {salePrice > 0 && purchasePrice > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                هامش الربح: <span className="font-bold text-primary">{((salePrice - purchasePrice) / purchasePrice * 100).toFixed(1)}%</span>
                {" "}({(salePrice - purchasePrice).toFixed(2)} ر.س)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock */}
      <Card>
        <CardHeader><CardTitle>إعدادات المخزون</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الحد الأدنى للمخزون</Label>
              <Input type="number" min="0" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} placeholder="0" />
              <p className="text-xs text-muted-foreground">تنبيه عند وصول المخزون لهذا الحد</p>
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى للمخزون</Label>
              <Input type="number" min="0" value={maxStock || ""} onChange={(e) => setMaxStock(Number(e.target.value))} placeholder="غير محدد" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">خدمة (بدون مخزون)</Label>
              <p className="text-sm text-muted-foreground">تفعيل هذا الخيار للخدمات التي لا تحتاج تتبع مخزون</p>
            </div>
            <Switch checked={isService} onCheckedChange={setIsService} />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">منتج نشط</Label>
              <p className="text-sm text-muted-foreground">المنتجات غير النشطة لن تظهر في الفواتير</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProduct;
