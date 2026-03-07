import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Save, Package, Loader2, Car, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAutoPartsAccess } from "@/hooks/useAutoPartsAccess";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import ImageUpload from "@/components/client/ImageUpload";

interface Category {
  id: string;
  name: string;
  name_en: string | null;
}

interface CarBrand {
  id: string;
  name: string;
  name_en: string | null;
}

interface CarModel {
  id: string;
  name: string;
  name_en: string | null;
  brand_id: string;
}

const CreateProduct = () => {
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Auto parts fields
  const [oemNumber, setOemNumber] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [partCondition, setPartCondition] = useState("new");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [companyUnits, setCompanyUnits] = useState<{ id: string; name: string; name_en: string | null; symbol: string | null }[]>([]);

  // Fetch car brands for auto parts
  const { data: carBrands } = useQuery({
    queryKey: ["car-brands-create", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("car_brands")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as CarBrand[];
    },
    enabled: !!companyId && isAutoPartsCompany,
  });

  // Fetch car models for selected brand
  const { data: carModels } = useQuery({
    queryKey: ["car-models-create", companyId, selectedBrand],
    queryFn: async () => {
      if (!companyId || !selectedBrand) return [];
      const { data, error } = await supabase
        .from("car_models")
        .select("*")
        .eq("company_id", companyId)
        .eq("brand_id", selectedBrand)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as CarModel[];
    },
    enabled: !!companyId && !!selectedBrand && isAutoPartsCompany,
  });

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    try {
      const resolvedId = await (await import("@/hooks/useCompanyId")).fetchCompanyId(user?.id || "");
      if (!resolvedId) throw new Error("No company found");
      const companyData = { id: resolvedId };
      setCompanyId(companyData.id);

      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("id, name, name_en")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .order("name");

      setCategories(categoriesData || []);

      const { data: unitsData } = await supabase
        .from("units")
        .select("id, name, name_en, symbol")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .order("name");

      setCompanyUnits(unitsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addModel = (modelId: string) => {
    if (!selectedModels.includes(modelId)) {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const removeModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter((id) => id !== modelId));
  };

  const handleSave = async () => {
    if (!companyId) return;

    if (!name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المنتج",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Auto-generate SKU if not provided
      let finalSku = sku.trim();
      if (!finalSku) {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId);
        const nextNum = (count || 0) + 1;
        finalSku = `PRD-${String(nextNum).padStart(4, "0")}`;
      }

      const insertData = {
        company_id: companyId,
        name: name.trim(),
        name_en: nameEn.trim() || null,
        sku: finalSku,
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
        image_url: imageUrl,
        oem_number: isAutoPartsCompany ? (oemNumber.trim() || null) : null,
        shelf_location: isAutoPartsCompany ? (shelfLocation.trim() || null) : null,
        part_condition: isAutoPartsCompany ? partCondition : "new",
      };

      const { data: product, error } = await supabase
        .from("products")
        .insert(insertData)
        .select("id")
        .single();

      if (error) throw error;

      // Save car compatibility
      if (isAutoPartsCompany && selectedModels.length > 0 && product) {
        const compatData = selectedModels.map((modelId) => ({
          product_id: product.id,
          car_model_id: modelId,
        }));
        await supabase.from("product_car_compatibility").insert(compatData as any);
      }

      toast({
        title: "تم الحفظ",
        description: "تم إضافة المنتج بنجاح",
      });

      navigate("/client/inventory");
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ المنتج",
        variant: "destructive",
      });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/inventory")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">منتج جديد</h1>
            <p className="text-muted-foreground">إضافة منتج أو خدمة جديدة</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          <Save className="h-4 w-4 ml-2" />
          حفظ المنتج
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            البيانات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-start">
            <div>
              <Label className="mb-2 block">{isService ? "صورة الخدمة" : "صورة المنتج"}</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} folder="products" size="lg" />
            </div>
            <div className="flex-1 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المنتج (عربي) *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المنتج بالعربي"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم المنتج (إنجليزي)</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Product name in English"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>رمز المنتج (SKU)</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="PRD-001"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>الباركود</Label>
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="1234567890123"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوحدة" />
                </SelectTrigger>
                <SelectContent>
                  {companyUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} {u.symbol ? `(${u.symbol})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>التصنيف</Label>
            <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون تصنيف</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المنتج..."
              rows={3}
            />
          </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Parts Section */}
      {isAutoPartsCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              بيانات قطع الغيار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>رقم القطعة الأصلي (OEM)</Label>
                <Input
                  value={oemNumber}
                  onChange={(e) => setOemNumber(e.target.value)}
                  placeholder="OEM-12345"
                  className="font-mono"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>موقع الرف</Label>
                <Input
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  placeholder="A-01-03"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>حالة القطعة</Label>
                <Select value={partCondition} onValueChange={setPartCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">جديد</SelectItem>
                    <SelectItem value="used">مستعمل</SelectItem>
                    <SelectItem value="refurbished">مجدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Car Compatibility */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">توافق السيارات</Label>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الماركة</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الماركة" />
                    </SelectTrigger>
                    <SelectContent>
                      {carBrands?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الموديل</Label>
                  <div className="flex gap-2">
                    <Select
                      value=""
                      onValueChange={(v) => v && addModel(v)}
                      disabled={!selectedBrand}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر الموديل" />
                      </SelectTrigger>
                      <SelectContent>
                        {carModels?.filter((m) => !selectedModels.includes(m.id)).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Selected Models */}
              {selectedModels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedModels.map((modelId) => {
                    const model = carModels?.find((m) => m.id === modelId);
                    const brand = carBrands?.find((b) => b.id === selectedBrand);
                    return (
                      <Badge key={modelId} variant="secondary" className="gap-1 px-3 py-1">
                        {brand?.name} - {model?.name || modelId}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeModel(modelId)}
                        />
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
        <CardHeader>
          <CardTitle>الأسعار والضريبة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>سعر الشراء</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice || ""}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>سعر البيع</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={salePrice || ""}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>نسبة الضريبة %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
          </div>

          {salePrice > 0 && purchasePrice > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                هامش الربح: <span className="font-bold text-primary">
                  {((salePrice - purchasePrice) / purchasePrice * 100).toFixed(1)}%
                </span>
                {" "}({(salePrice - purchasePrice).toFixed(2)} ر.س)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات المخزون</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الحد الأدنى للمخزون</Label>
              <Input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">تنبيه عند وصول المخزون لهذا الحد</p>
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى للمخزون</Label>
              <Input
                type="number"
                min="0"
                value={maxStock || ""}
                onChange={(e) => setMaxStock(Number(e.target.value))}
                placeholder="غير محدد"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">خدمة (بدون مخزون)</Label>
              <p className="text-sm text-muted-foreground">
                تفعيل هذا الخيار للخدمات التي لا تحتاج تتبع مخزون
              </p>
            </div>
            <Switch checked={isService} onCheckedChange={setIsService} />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">منتج نشط</Label>
              <p className="text-sm text-muted-foreground">
                المنتجات غير النشطة لن تظهر في الفواتير
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProduct;
