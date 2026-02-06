

# اصلاح: عدم ظهور شاشات قطع الغيار للعميل المشترك

## المشاكل المكتشفة

### 1. عدم تطابق قيمة نوع النشاط
- **صفحة التسجيل** تحفظ القيمة: `"auto_parts_shops"` (تحويل من اسم النشاط الإنجليزي)
- **Hook التحقق** يبحث عن القيمة: `"auto_parts"`
- النتيجة: لا تتطابق القيمتان ابداً، فلا تظهر شاشات قطع الغيار

### 2. مشكلة تعدد الشركات
- المستخدم الحالي لديه 4 شركات مسجلة في قاعدة البيانات
- `useTenantIsolation` يستخدم `.single()` الذي يُرجع خطأ عند وجود أكثر من سجل واحد
- النتيجة: يرجع `null` دائماً ولا يتم التعرف على الشركة أو نوع نشاطها

### 3. لا توجد شركة بنشاط قطع غيار
- في قاعدة البيانات الحالية، لا توجد أي شركة بنوع نشاط يطابق `"auto_parts"` أو `"auto_parts_shops"`

---

## الحل المقترح

### الاصلاح 1: توحيد قيمة نوع النشاط (CompanyRegistration.tsx)
- تغيير القيمة المحفوظة لتكون `name_en` بالضبط كما في قاعدة البيانات (بدون تحويل)
- أو حفظ `id` النشاط بدلاً من الاسم المحوّل
- **الحل الأنسب**: حفظ `name_en` كما هو من جدول `business_verticals` بدون أي تحويل

### الاصلاح 2: تحديث التحقق في useAutoPartsAccess
- تغيير المقارنة لتطابق القيمة الفعلية المحفوظة
- استخدام `"Auto Parts Shops"` بدلاً من `"auto_parts"`

### الاصلاح 3: معالجة تعدد الشركات في useTenantIsolation
- تغيير `.single()` إلى `.maybeSingle()` أو `.limit(1)` لتجنب الخطأ عند تعدد الشركات
- ترتيب حسب تاريخ الإنشاء (الأحدث أولاً) لاختيار آخر شركة مسجلة

### الاصلاح 4: تحديث البيانات الموجودة
- تحديث الشركات الموجودة في قاعدة البيانات لتصحيح قيم `activity_type`

---

## التفاصيل التقنية

### الملفات المعدلة

**1. `src/pages/CompanyRegistration.tsx`**
- تغيير سطر 359 من:
```typescript
value={v.name_en.toLowerCase().replace(/\s+/g, '_')}
```
الى:
```typescript
value={v.name_en}
```
- تغيير سطر 351 لإزالة التحويل عند الحفظ:
```typescript
onValueChange={(v) => handleInputChange("activity_type", v === "__general__" ? "general" : v)}
```
يبقى كما هو لأن القيمة ستأتي صحيحة الآن

**2. `src/hooks/useAutoPartsAccess.ts`**
- تغيير المقارنة من:
```typescript
const isAutoPartsCompany = company?.activity_type === "auto_parts";
```
الى:
```typescript
const isAutoPartsCompany = company?.activity_type === "Auto Parts Shops";
```

**3. `src/hooks/useTenantIsolation.ts`**
- تغيير الاستعلام من `.single()` إلى `.order("created_at", { ascending: false }).limit(1)` ثم أخذ أول عنصر
- هذا يمنع الخطأ عند وجود عدة شركات للمستخدم نفسه ويرجع الأحدث

**4. `src/pages/client/CreateProduct.tsx`**
- تحديث أي مقارنة تستخدم `"auto_parts"` لتطابق القيمة الجديدة

### تحديث البيانات
- لا حاجة لـ migration جديد
- تحديث الشركات الموجودة (إن وجدت) لتصحيح قيم `activity_type` المحفوظة سابقاً

