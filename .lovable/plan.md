

## خطة الإصلاح

### المشكلة الأولى: تحميل الخصومات والجزاءات الافتراضية
**السبب**: عمود `third_offense` في جدول `hr_penalty_rules` معرّف كـ `NOT NULL`، لكن بعض البيانات الافتراضية (مثل ABS-04) تحتوي على `third: null`. هذا يسبب خطأ عند الإدخال.

**الحل**: تعديل قاعدة البيانات لجعل `third_offense` قابلاً للقيم الفارغة (nullable)، ثم تحديث البيانات الافتراضية في الكود لتحويل `null` إلى `""` كاحتياط.

- Migration: `ALTER TABLE hr_penalty_rules ALTER COLUMN third_offense DROP NOT NULL;`
- كود: تحديث `loadDefaultsMutation` لإرسال `""` بدل `null` كاحتياط إضافي

### المشكلة الثانية: التواريخ في طلب الإجازة
**السبب**: دالة `updateDays` تشترط وجود كلا التاريخين (`start` و `end`) قبل تحديث الحالة. عندما يختار المستخدم تاريخ البداية فقط، لا يتم تحديث `form.start_date` لأن `form.end_date` لا يزال فارغاً، والعكس صحيح.

**الحل في `Leaves.tsx`**: تعديل منطق التحديث ليحفظ كل تاريخ بشكل مستقل، ويحسب عدد الأيام فقط عند توفر كلا التاريخين:

```typescript
// بدلاً من updateDays التي تشترط كلا التاريخين:
onChange={(e) => {
  const start = e.target.value;
  setForm(f => {
    const newForm = { ...f, start_date: start };
    if (start && f.end_date) {
      const [sy,sm,sd] = start.split("-").map(Number);
      const [ey,em,ed] = f.end_date.split("-").map(Number);
      const diff = Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / 86400000) + 1;
      newForm.days_count = Math.max(1, diff);
    }
    return newForm;
  });
}}
```

نفس النمط لحقل تاريخ النهاية. هذا يستخدم أيضاً parsing محلي للتواريخ لتجنب مشاكل timezone.

### الملفات المتأثرة
- `src/pages/client/hr/PenaltyRules.tsx` — تحديث بيانات الافتراضي
- `src/pages/client/hr/Leaves.tsx` — إصلاح منطق التواريخ
- Migration: جعل `third_offense` nullable

