

# خطة بناء نظام إدارة محلات قطع غيار السيارات

## ملخص المشروع
تخصيص الشاشات الحالية (المخزون، المبيعات، المشتريات، جهات الاتصال) لتدعم متطلبات محلات قطع غيار السيارات، مع إضافة جداول قاعدة بيانات جديدة لتخزين بيانات السيارات (الماركات والموديلات) وربط القطع بها، وتفعيل نشاط قطع الغيار في صفحة الأنشطة.

---

## المرحلة 1: قاعدة البيانات - الجداول الجديدة

### 1. جدول ماركات السيارات `car_brands`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid | المعرف |
| company_id | uuid | معرف الشركة |
| name | text | الاسم بالعربية |
| name_en | text | الاسم بالإنجليزية |
| logo_url | text | شعار الماركة (اختياري) |
| is_active | boolean | الحالة |
| sort_order | integer | الترتيب |

### 2. جدول موديلات السيارات `car_models`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid | المعرف |
| company_id | uuid | معرف الشركة |
| brand_id | uuid | FK -> car_brands |
| name | text | الاسم بالعربية |
| name_en | text | الاسم بالإنجليزية |
| year_from | integer | سنة البداية |
| year_to | integer | سنة النهاية |
| is_active | boolean | الحالة |

### 3. جدول ربط المنتجات بالموديلات `product_car_compatibility`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid | المعرف |
| product_id | uuid | FK -> products |
| car_model_id | uuid | FK -> car_models |
| notes | text | ملاحظات التوافق |

### 4. إضافة أعمدة جديدة لجدول `products`
| العمود | النوع | الوصف |
|--------|-------|-------|
| oem_number | text | رقم القطعة الأصلي (OEM) |
| cross_reference | text[] | أرقام القطع البديلة |
| shelf_location | text | موقع الرف في المستودع |
| part_condition | text | حالة القطعة (جديد/مستعمل/تجديد) |

سياسات الأمان (RLS) لكل جدول: قراءة وإدارة مقيدة بـ `is_company_owner(company_id)`.

---

## المرحلة 2: شاشات العميل - تخصيص الشاشات الحالية

### 1. تعديل شاشة المخزون (`ClientInventory.tsx`)
- إضافة تبويب جديد "كتالوج القطع" يعرض القطع مع أرقام OEM والتوافق
- إضافة تبويب "الماركات والموديلات" لإدارة ماركات السيارات وموديلاتها
- إضافة فلتر بحث بالرقم التسلسلي (OEM) وبالماركة والموديل
- إظهار موقع الرف ومعلومات القطعة البديلة

### 2. تعديل شاشة إنشاء المنتج (`CreateProduct.tsx`)
- إضافة حقول جديدة: رقم OEM، أرقام بديلة، موقع الرف، حالة القطعة
- إضافة قسم "توافق السيارات" لربط القطعة بماركات وموديلات محددة
- إمكانية إضافة عدة موديلات لنفس القطعة

### 3. تعديل شاشة المبيعات (`ClientSales.tsx`)
- إضافة بحث سريع بالقطعة حسب رقم OEM أو الماركة/الموديل
- عرض معلومات التوافق في تفاصيل الفاتورة

### 4. تعديل شاشة الموردين (`Vendors.tsx`)
- إضافة حقل "الماركات الموردة" لربط المورد بالماركات التي يوفرها

### 5. إضافة صفحات جديدة
- **`src/pages/client/autoparts/CarBrands.tsx`**: إدارة ماركات السيارات (CRUD)
- **`src/pages/client/autoparts/CarModels.tsx`**: إدارة موديلات السيارات (CRUD)
- **`src/pages/client/autoparts/PartsCatalog.tsx`**: كتالوج القطع مع بحث متقدم

---

## المرحلة 3: تحديث القائمة الجانبية

إضافة قسم جديد "قطع الغيار" في `ClientLayout.tsx`:

```text
قطع الغيار
  ├── كتالوج القطع
  ├── الماركات
  └── الموديلات
```

سيظهر هذا القسم فقط عندما يكون نوع نشاط الشركة هو "قطع غيار سيارات".

---

## المرحلة 4: تفعيل النشاط في صفحة الأنشطة

### 1. تحديث حالة نشاط قطع الغيار
- تغيير `status` من `coming_soon` إلى `active` في جدول `business_verticals`
- تحديث `is_active` إلى `true`

### 2. تعديل صفحة التسجيل (`CompanyRegistration.tsx`)
- إضافة اختيار نوع النشاط (قطع غيار / تجارة عامة / إلخ) من الأنشطة المفعلة
- حفظ نوع النشاط المختار في حقل `activity_type` في جدول `companies`

---

## المرحلة 5: التحكم في الصلاحيات من لوحة المالك

### 1. إضافة شاشات قطع الغيار في `system_screens`
إدراج شاشات النظام الجديدة:
- `auto_parts_catalog` - كتالوج القطع
- `auto_parts_brands` - ماركات السيارات
- `auto_parts_models` - موديلات السيارات

### 2. تحديث `OwnerScreens.tsx`
إضافة وحدة "قطع الغيار" (`auto_parts`) في تصنيف الشاشات مع أيقونة مخصصة.

### 3. ربط الشاشات بالباقات
المالك يستطيع من صفحة إدارة شاشات الباقات تحديد أي شاشات قطع الغيار متاحة لكل باقة.

---

## التفاصيل التقنية

### الملفات الجديدة (7 ملفات)
1. `src/pages/client/autoparts/CarBrands.tsx` - إدارة ماركات السيارات
2. `src/pages/client/autoparts/CarModels.tsx` - إدارة موديلات السيارات
3. `src/pages/client/autoparts/PartsCatalog.tsx` - كتالوج القطع مع بحث متقدم
4. `src/pages/client/autoparts/CreateCarBrand.tsx` - إنشاء ماركة جديدة
5. `src/pages/client/autoparts/CreateCarModel.tsx` - إنشاء موديل جديد
6. `src/hooks/useAutoPartsAccess.ts` - Hook للتحقق من صلاحية الوصول لشاشات قطع الغيار
7. Migration SQL - إنشاء الجداول الجديدة

### الملفات المعدلة (8 ملفات)
1. `src/App.tsx` - إضافة routes جديدة لقطع الغيار
2. `src/components/client/ClientLayout.tsx` - إضافة قسم قطع الغيار في القائمة
3. `src/pages/client/ClientInventory.tsx` - تعديل شاشة المخزون
4. `src/pages/client/CreateProduct.tsx` - إضافة حقول قطع الغيار
5. `src/pages/client/ClientSales.tsx` - بحث بالماركة/الموديل
6. `src/pages/CompanyRegistration.tsx` - اختيار نوع النشاط
7. `src/pages/owner/OwnerScreens.tsx` - إضافة وحدة قطع الغيار
8. `src/pages/Activities.tsx` - تفعيل زر الاشتراك لقطع الغيار

### قاعدة البيانات - SQL Migration

```sql
-- 1. Car Brands Table
CREATE TABLE public.car_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.car_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owner can manage car brands" ON public.car_brands FOR ALL USING (is_company_owner(company_id));
CREATE POLICY "Company owner can view car brands" ON public.car_brands FOR SELECT USING (is_company_owner(company_id));

-- 2. Car Models Table
CREATE TABLE public.car_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES car_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  year_from INTEGER,
  year_to INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.car_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owner can manage car models" ON public.car_models FOR ALL USING (is_company_owner(company_id));
CREATE POLICY "Company owner can view car models" ON public.car_models FOR SELECT USING (is_company_owner(company_id));

-- 3. Product-Car Compatibility Table
CREATE TABLE public.product_car_compatibility (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  car_model_id UUID NOT NULL REFERENCES car_models(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, car_model_id)
);

ALTER TABLE public.product_car_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owner can manage compatibility" ON public.product_car_compatibility FOR ALL
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_car_compatibility.product_id AND is_company_owner(p.company_id)));
CREATE POLICY "Company owner can view compatibility" ON public.product_car_compatibility FOR SELECT
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_car_compatibility.product_id AND is_company_owner(p.company_id)));

-- 4. Add auto parts columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS oem_number TEXT,
  ADD COLUMN IF NOT EXISTS cross_reference TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS shelf_location TEXT,
  ADD COLUMN IF NOT EXISTS part_condition TEXT DEFAULT 'new';

-- 5. Add auto parts screens to system_screens
INSERT INTO public.system_screens (key, name_ar, name_en, module, sort_order) VALUES
  ('auto_parts_catalog', 'كتالوج القطع', 'Parts Catalog', 'auto_parts', 60),
  ('auto_parts_brands', 'ماركات السيارات', 'Car Brands', 'auto_parts', 61),
  ('auto_parts_models', 'موديلات السيارات', 'Car Models', 'auto_parts', 62);
```

### عرض شاشات قطع الغيار حسب نوع النشاط

قسم قطع الغيار في القائمة الجانبية سيظهر فقط للشركات التي نوع نشاطها `auto_parts` من خلال hook يتحقق من `activity_type` في جدول `companies`.

### تدفق العمل المتوقع

1. المالك يفعل نشاط "قطع غيار السيارات" من لوحة التحكم
2. المالك يحدد الشاشات المتاحة لكل باقة اشتراك
3. العميل يسجل شركة جديدة ويختار نشاط "قطع غيار"
4. بعد التفعيل يظهر قسم "قطع الغيار" في القائمة الجانبية
5. العميل يضيف الماركات والموديلات
6. يضيف القطع مع أرقام OEM وربطها بالموديلات
7. يستخدم البحث المتقدم في البيع والشراء

