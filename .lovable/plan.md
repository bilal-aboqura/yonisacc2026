

# خطة: إخفاء الوحدات المعطّلة عن المشترك

## المشكلة
عند إلغاء تفعيل وحدة من المالك، لا تختفي من القائمة الجانبية للمشترك لسببين:
1. **الحفظ يحدّث فقط سجل المالك** في `company_members` (فلتر `eq("user_id", owner_id)`) بدلاً من جميع أعضاء الشركة.
2. **`ClientLayout.tsx` لا يقرأ `allowed_modules` أصلاً** — يعرض جميع الوحدات دائماً.

## الحل

### 1. تحديث حفظ الوحدات (ManageCompanyAccess.tsx)
- عند الحفظ، تحديث **جميع** أعضاء الشركة (`company_members`) وليس المالك فقط.
- إزالة فلتر `.eq("user_id", company.owner_id)` واستبداله بـ `.eq("company_id", id)` فقط.

### 2. إنشاء hook جديد: `useAllowedModules`
- يجلب `allowed_modules` من `company_members` للمستخدم الحالي والشركة الحالية.
- يُرجع قائمة الوحدات المسموحة و دالة `isModuleAllowed(key)`.

### 3. تعديل ClientLayout.tsx
- استدعاء `useAllowedModules` hook.
- إضافة خطوة فلترة بعد `filterByPermission` لإزالة الوحدات غير المسموحة.
- ربط كل مجموعة قائمة (autoparts, gold, clinic, etc.) بمفتاح module واضح لتسهيل الفلترة.
- إضافة خاصية `moduleKey` لكل مجموعة قائمة في `MenuItem` interface.

### 4. تعيين moduleKey لكل مجموعة

```text
baseMenuItems:
  - Dashboard        → (always visible)
  - المحاسبة المالية  → "accounting"
  - المبيعات          → "sales"  
  - المشتريات         → "purchases"
  - الموارد البشرية   → "hr"
  - المخزون           → "inventory"
  - نقاط البيع        → "pos"
  - التقارير          → "reports"
  - الإعدادات         → (always visible)

Separate groups:
  - autoPartsMenuGroup   → "autoparts"
  - fixedAssetsMenuGroup → "assets"
  - goldMenuGroup        → "gold"
  - clinicMenuGroup      → "clinic"
  - realEstateMenuGroup  → "realestate"
  - deliveryMenuGroup    → "delivery"
```

### الملفات المتأثرة
- `src/hooks/useAllowedModules.ts` — ملف جديد
- `src/components/client/ClientLayout.tsx` — فلترة القائمة
- `src/pages/owner/ManageCompanyAccess.tsx` — تحديث جميع الأعضاء

