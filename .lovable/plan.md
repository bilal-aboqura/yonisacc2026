

## إصلاح مشكلة إضافة السلفة

### المشكلة
الخطأ: `Could not find the 'source' column of 'journal_entries' in the schema cache`

الكود يحاول إدراج عمود `source` في جدول `journal_entries`، لكن هذا العمود غير موجود. الأعمدة الصحيحة هي `reference_type` و `is_auto`.

### الحل

**ملف `src/pages/client/hr/Loans.tsx`** — تعديلان:

**1. استبدال `source` بـ `reference_type` و `is_auto`:**
```typescript
// قبل (خطأ):
status: "posted", source: "hr_loan", created_by: null,

// بعد (صحيح):
status: "posted", reference_type: "hr_loan", is_auto: true, created_by: null,
```

**2. إصلاح ترقيم القيود (نفس الإصلاح المطبق في الرواتب):**
- جلب أقصى رقم قيد موجود فعلياً في `journal_entries` والمقارنة مع `next_journal_number` من الإعدادات
- البدء من الرقم الأكبر لتجنب خطأ `duplicate key`

### الملف المتأثر
- `src/pages/client/hr/Loans.tsx`

