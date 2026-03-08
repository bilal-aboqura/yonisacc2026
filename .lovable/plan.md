

# خطة: إصلاح حفظ الوحدات المتاحة

## المشكلة
عند حفظ الوحدات، الكود ينفذ `UPDATE company_members SET allowed_modules = ... WHERE company_id = ...` — لكن **لا يوجد سجل في `company_members`** لهذه الشركة أصلاً. لذلك `UPDATE` يعود بـ 0 صفوف متأثرة، ولا شيء يُحفظ. وعند إعادة التحميل، لا يوجد سجل فيعود للقيمة الافتراضية (كل الوحدات مفعلة).

## الحل

### ملف: `src/pages/owner/ManageCompanyAccess.tsx`

**1. عند التحميل (useEffect):** بدلاً من البحث عن سجل المالك فقط، نبحث عن **أي سجل** للشركة. إذا لم يوجد أي سجل، نُنشئ سجل `company_members` للمالك تلقائياً (upsert).

**2. عند حفظ الوحدات (handleSaveModules):**
- أولاً: تحديث جميع السجلات الموجودة.
- ثانياً: إذا لم يتأثر أي سجل (count = 0)، ننشئ سجل جديد للمالك باستخدام `upsert` يحتوي على `allowed_modules`.

### التغييرات المحددة

```text
handleSaveModules:
  1. UPDATE company_members SET allowed_modules WHERE company_id
  2. إذا لم يتأثر أي سجل → INSERT/UPSERT سجل جديد للمالك
     { company_id, user_id: owner_id, role: 'owner', allowed_modules, is_active: true }

useEffect (load):
  - query company_members WHERE company_id (بدون فلتر user_id)
  - إذا وُجد سجل واحد على الأقل → استخدم allowed_modules منه
  - إذا لم يوجد → أبقِ القيمة الافتراضية (كل الوحدات)
```

### ملف واحد يتأثر
- `src/pages/owner/ManageCompanyAccess.tsx`

