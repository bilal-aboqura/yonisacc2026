

## المشكلة

تحليل نظام الوحدات كشف عن عدة مشاكل في ربط الوحدات بين لوحة المالك (Owner) ولوحة المستخدم (Client):

### 1. المالك لا يرى القيود على الوحدات
`useAllowedModules` يبحث عن سجل في `company_members` للمستخدم الحالي. إذا كان المستخدم هو مالك الشركة وليس لديه سجل في `company_members`، الهوك يعود `null` = **كل الوحدات متاحة** بغض النظر عن إعدادات المالك.

### 2. وحدة "الخزينة" في لوحة المالك بدون تأثير
لوحة المالك تحتوي على وحدة `treasury` لكن في القائمة الجانبية للعميل، الخزينة جزء من مجموعة "المحاسبة" (`accounting`) وليس لها `moduleKey` مستقل.

### 3. عدم مزامنة الوحدات مع الباقة
عند حفظ الوحدات من لوحة المالك، يتم التحديث فقط على `company_members` بدون تحديث `subscription_plans.allowed_modules`.

---

## الخطة

### الخطوة 1: إصلاح `useAllowedModules` — دعم المالك
- إضافة فحص: إذا لم يوجد سجل `company_members` للمستخدم، البحث عن سجلات أخرى لنفس الشركة (أي عضو آخر) لقراءة `allowed_modules`
- إضافة فحص بديل: إذا كان المستخدم هو `owner_id` في جدول `companies`، يستخدم `allowed_modules` من أي سجل `company_members` لنفس الشركة

### الخطوة 2: إضافة `moduleKey: "treasury"` للقائمة الجانبية
- فصل الخزينة كعنصر مستقل في `baseMenuItems` مع `moduleKey: "treasury"`، أو إضافة `moduleKey` على مستوى العناصر الفرعية
- الأبسط: إضافة `moduleKey: "treasury"` على مجموعة الخزينة إذا كانت منفصلة، أو إزالة "treasury" من قائمة الوحدات في لوحة المالك لأنها فعلياً جزء من المحاسبة

### الخطوة 3: ضمان إنشاء سجل `company_members` للمالك
- في `handleSaveModules` بلوحة المالك، التأكد من إنشاء/تحديث سجل للمالك أيضاً (هذا موجود جزئياً لكن يعمل فقط إذا لم يوجد أي سجل)

---

## التفاصيل التقنية

**`src/hooks/useAllowedModules.ts`**:
```typescript
// بعد فحص memberData، إذا لم يوجد سجل للمستخدم الحالي:
// فحص أي سجل company_members آخر لنفس الشركة
const { data: anyMember } = await supabase
  .from("company_members")
  .select("allowed_modules")
  .eq("company_id", companyId)
  .eq("is_active", true)
  .not("allowed_modules", "is", null)
  .limit(1)
  .maybeSingle();
if (anyMember?.allowed_modules?.length > 0) {
  return anyMember.allowed_modules;
}
```

**`src/components/client/ClientLayout.tsx`**:
- إزالة "treasury" من `ALL_MODULES` في لوحة المالك أو إضافة عنصر خزينة مستقل في القائمة الجانبية مع `moduleKey: "treasury"`

**`src/pages/owner/ManageCompanyAccess.tsx`**:  
- تعديل `handleSaveModules` لضمان وجود سجل للمالك دائماً عبر `upsert` بدلاً من `insert` الشرطي

