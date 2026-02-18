
# تحويل دليل الحسابات إلى دليل موحد مشترك

## المشكلة الحالية
كل شركة تحصل على نسخة منفصلة من الحسابات الافتراضية (is_system = true). هذا يعني:
- تكرار البيانات: 10 شركات × 37 حساب = 370 صف مكرر
- صعوبة تحديث الدليل الموحد لاحقاً
- كل شركة "تملك" حسابات النظام في جدول `accounts`

## الحل المقترح: جدول منفصل للحسابات الموحدة

### البنية الجديدة

```text
global_accounts (جدول جديد)
├── id, code, name, name_en, type
├── parent_code (لبناء الشجرة بدون uuid)
├── is_parent, sort_order
└── is_active

accounts (الجدول الحالي - للحسابات المخصصة فقط)
├── company_id (حسابات الشركة الخاصة بها)
├── global_account_id (null = حساب خاص، رقم = مرتبط بالموحد)
└── balance (الرصيد الافتتاحي الخاص بكل شركة)
```

### كيف تعمل الشاشة بعد التعديل
1. **عرض الشجرة**: تجمع بين الحسابات الموحدة من `global_accounts` + الحسابات الخاصة بالشركة من `accounts`
2. **الرصيد الافتتاحي**: يُحفظ في `accounts` (سجل واحد لكل شركة لكل حساب موحد)
3. **إضافة حساب**: تضاف فقط للجدول `accounts` كحسابات مخصصة بجوار الشجرة الموحدة

---

## خطوات التنفيذ

### 1. Migration قاعدة البيانات
- إنشاء جدول `global_accounts` مع سياسة RLS تسمح للجميع بالقراءة
- نقل الحسابات الموحدة (is_system = true) من أي شركة إلى الجدول الجديد
- إضافة عمود `global_account_id` في جدول `accounts` لربط الأرصدة
- إضافة سياسات RLS للجدول الجديد

### 2. تعديل `src/pages/client/ClientAccounts.tsx`
- **إزالة** زر "إنشاء الحسابات الافتراضية" وكل منطقه
- **إزالة** `handleCreateDefaultAccounts` function
- **إزالة** state `isCreatingDefaults`
- **تحديث** جلب البيانات: جلب `global_accounts` أولاً ثم دمجها مع `accounts` الخاصة بالشركة
- **تحديث** حفظ الرصيد الافتتاحي: يحفظ في جدول `accounts` بربط `global_account_id`

### 3. تعديل `src/pages/client/CreateAccount.tsx`
- تعديل قائمة "الحساب الرئيسي" لتشمل الحسابات الموحدة من `global_accounts`

### 4. تعديل `src/pages/client/EditAccount.tsx`
- تعديل قائمة "الحساب الرئيسي" لتشمل الحسابات الموحدة

### 5. تعديل `src/pages/client/OpeningBalances.tsx`
- تحديث جلب البيانات لدمج الجدولين

---

## التفاصيل التقنية

### جدول `global_accounts` الجديد
```sql
CREATE TABLE public.global_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_en text,
  type text NOT NULL,
  parent_code text,  -- كود الحساب الأب (سهل البناء بدون FK)
  is_parent boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS: الكل يقرأ
ALTER TABLE public.global_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global accounts"
  ON public.global_accounts FOR SELECT USING (true);
CREATE POLICY "Owners can manage global accounts"
  ON public.global_accounts FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));
```

### عمود `global_account_id` في `accounts`
```sql
ALTER TABLE public.accounts 
  ADD COLUMN global_account_id uuid REFERENCES public.global_accounts(id);
```

### نقل الحسابات الموحدة
```sql
-- نقل الحسابات الموحدة من أول شركة إلى global_accounts
INSERT INTO public.global_accounts (code, name, name_en, type, is_parent, sort_order)
SELECT DISTINCT ON (code) code, name, name_en, type, is_parent, sort_order
FROM public.accounts 
WHERE is_system = true
ORDER BY code, sort_order;

-- تحديث parent_code
UPDATE public.global_accounts ga
SET parent_code = (
  SELECT ga2.code FROM public.global_accounts ga2
  WHERE ga2.id = (
    SELECT parent_id FROM public.accounts a
    WHERE a.code = ga.code AND a.is_system = true
    LIMIT 1
  )
);
```

---

## التغييرات على سلوك الشاشة

| قبل | بعد |
|-----|-----|
| كل شركة عندها نسخة من الحسابات | الحسابات الموحدة مشتركة بين الجميع |
| زر "إنشاء الحسابات الافتراضية" ظاهر | الزر محذوف نهائياً |
| الرصيد محفوظ في نفس سجل الحساب | الرصيد محفوظ في سجل خاص بالشركة |
| إضافة حساب يضاف للجدول المشترك | إضافة حساب يضاف لجدول الشركة فقط |

---

## الملفات المعدلة
1. **Migration SQL** - جدول جديد + نقل بيانات + عمود جديد
2. `src/pages/client/ClientAccounts.tsx` - إزالة الزر + تحديث جلب البيانات
3. `src/pages/client/CreateAccount.tsx` - تحديث قائمة الحسابات الرئيسية
4. `src/pages/client/EditAccount.tsx` - تحديث قائمة الحسابات الرئيسية
5. `src/pages/client/OpeningBalances.tsx` - تحديث جلب البيانات
