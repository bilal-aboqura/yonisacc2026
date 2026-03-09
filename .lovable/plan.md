

## إضافة بحث في القوائم المنسدلة لتجهيز الحسابات

### المشكلة
القوائم المنسدلة في شاشات تجهيز الحسابات تستخدم `Select` العادي بدون بحث، مما يصعّب إيجاد الحساب المطلوب عند وجود عشرات الحسابات.

### الحل
استبدال `Select` بـ Combobox (Popover + Command) مع حقل بحث، بنفس النمط المستخدم حالياً في `CreateJournalEntry.tsx` و `GeneralLedger.tsx`.

### الملفات المتأثرة

#### 1. إنشاء مكوّن `AccountCombobox` مشترك
- ملف جديد: `src/components/client/AccountCombobox.tsx`
- يستقبل: `accounts[]`, `value`, `onChange`, `placeholder`, `isRTL`
- يستخدم `Popover` + `Command` + `CommandInput` للبحث بالاسم أو الرمز
- يعرض "-- بدون --" كخيار أول

#### 2. تعديل `ModuleAccountSetup.tsx`
- استبدال `Select` بـ `AccountCombobox` في حلقة عرض الحقول
- يؤثر على: تجهيز حسابات المخزون + قطع الغيار + جميع الوحدات التي تستخدم هذا المكوّن

#### 3. تعديل `HRAccountSetup.tsx`
- استبدال `Select` في `renderAccountSelect` بـ `AccountCombobox`

#### 4. تعديل `CreateAccount.tsx`
- استبدال قائمة "الحساب الرئيسي" المنسدلة بـ Combobox مع بحث

