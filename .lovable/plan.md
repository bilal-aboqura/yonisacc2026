

# خطة نظام إدارة السنوات المالية الشامل

## الوضع الحالي
- جدول `fiscal_periods` موجود بحقول أساسية (name, start_date, end_date, is_closed)
- دالة `generate_opening_balances_from_closing` RPC موجودة
- صفحة `FiscalPeriods.tsx` بسيطة (إضافة/قفل فقط)

## نظراً لضخامة المشروع، سيتم التنفيذ على 4 مراحل:

---

## المرحلة 1 — البنية التحتية وتطوير جدول السنوات المالية

### Migration 1: تطوير جدول fiscal_periods
```sql
-- إضافة أعمدة جديدة
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' 
  CHECK (status IN ('open','temporarily_locked','closed'));
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS locked_by UUID;
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS closing_journal_entry_id UUID;
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS opening_journal_entry_id UUID;
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS reopen_reason TEXT;
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS reopened_by UUID;
```

### Migration 2: جدول سجل تدقيق السنوات المالية
```sql
CREATE TABLE fiscal_year_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_periods(id),
  action TEXT NOT NULL, -- create, lock, unlock, close, reopen
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  details JSONB
);
```

### Migration 3: جدول جرد نهاية السنة
```sql
CREATE TABLE stock_count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_periods(id),
  status TEXT DEFAULT 'draft', -- draft, in_progress, completed, approved
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ, approved_at TIMESTAMPTZ
);

CREATE TABLE stock_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES stock_count_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  system_quantity NUMERIC DEFAULT 0,
  physical_quantity NUMERIC,
  variance NUMERIC GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,
  unit_cost NUMERIC DEFAULT 0,
  notes TEXT
);
```

---

## المرحلة 2 — واجهة إدارة السنوات المالية الرئيسية

### ملف: `src/pages/client/FiscalYearManagement.tsx` (إعادة بناء كامل)
- **تبويبات رئيسية**: السنوات المالية | التحقق قبل الإقفال | الجرد | تقرير الإقفال | سجل التدقيق
- **بطاقات إحصائية**: سنوات مفتوحة / مقفلة مؤقتاً / مقفلة نهائياً
- **جدول السنوات**: الاسم، الفترة، الحالة (مع ألوان: أخضر/أصفر/أحمر)، إجراءات
- **إجراءات**: قفل مؤقت ← إقفال نهائي ← إعادة فتح

### ملف: `src/components/fiscal/PreClosingValidation.tsx`
- تشغيل فحوصات التحقق التلقائي عبر RPC:
  - قيود يومية مسودة
  - فواتير مبيعات/مشتريات مسودة
  - حركات مخزون معلقة
  - فترات رواتب غير مقفلة
- عرض النتائج كقائمة ✅/❌ مع تفاصيل كل مشكلة
- حظر الإقفال إذا وُجدت مشاكل

### ملف: `src/components/fiscal/StockCountSession.tsx`
- إنشاء جلسة جرد مرتبطة بالسنة المالية
- عرض جميع المنتجات والمستودعات
- إدخال الكمية الفعلية وحساب الفرق تلقائياً
- توليد قيود تسوية المخزون تلقائياً

---

## المرحلة 3 — RPCs للعمليات الذرية

### RPC 1: `pre_closing_validation(p_company_id, p_fiscal_year_id)`
```text
يفحص:
- قيود يومية مسودة ضمن فترة السنة
- فواتير مبيعات/مشتريات مسودة
- حركات مخزون معلقة
- فترات رواتب غير مقفلة
يعيد: JSON بنتائج كل فحص (passed/failed + تفاصيل)
```

### RPC 2: `close_fiscal_year(p_company_id, p_fiscal_year_id, p_retained_earnings_account_id)`
```text
عملية ذرية:
1. التحقق أن السنة مقفلة مؤقتاً
2. تشغيل pre_closing_validation — رفض إذا فشل
3. حساب صافي الربح/الخسارة (إيرادات - مصروفات)
4. توليد قيد إقفال: صفر حسابات قائمة الدخل → أرباح مبقاة
5. توليد أرصدة افتتاحية للسنة الجديدة (أصول + خصوم + حقوق ملكية فقط)
6. تحويل أرصدة المخزون (كميات + تكلفة)
7. تحويل أرصدة الموظفين (قروض + سلف + إجازات + مكافآت)
8. تحديث الحالة إلى 'closed'
9. تسجيل في سجل التدقيق
```

### RPC 3: `reopen_fiscal_year(p_company_id, p_fiscal_year_id, p_reason)`
```text
1. التحقق من صلاحية المدير
2. عكس الأرصدة الافتتاحية المولدة
3. تغيير الحالة إلى 'open'
4. تسجيل سبب إعادة الفتح في سجل التدقيق
```

---

## المرحلة 4 — تقرير الإقفال وسجل التدقيق

### ملف: `src/components/fiscal/YearClosingReport.tsx`
- صافي الربح/الخسارة
- الأرصدة الختامية (ميزانية عمومية مختصرة)
- الأرصدة الافتتاحية للسنة الجديدة
- تقييم المخزون
- ملخص مالي شامل
- طباعة/تصدير PDF

### ملف: `src/components/fiscal/FiscalAuditLog.tsx`
- عرض كل العمليات على السنوات المالية
- فلترة حسب السنة/المستخدم/الإجراء
- المستخدم، الإجراء، التاريخ، الوقت، الملاحظات

---

## ملخص الملفات

| الملف | العملية |
|-------|---------|
| 3 Migrations (جداول + أعمدة) | إنشاء |
| 3 RPCs (validation, close, reopen) | إنشاء |
| `FiscalYearManagement.tsx` | إعادة بناء كامل |
| `PreClosingValidation.tsx` | إنشاء |
| `StockCountSession.tsx` | إنشاء |
| `YearClosingReport.tsx` | إنشاء |
| `FiscalAuditLog.tsx` | إنشاء |
| `ClientLayout.tsx` | تحديث القائمة |
| `App.tsx` | إضافة مسارات |

## ملاحظة مهمة
نظراً لحجم التغييرات الكبير (12+ ملف، 3 RPCs، 3 migrations)، سأنفذها على **دفعات متتالية**. الدفعة الأولى ستشمل المرحلتين 1 و 2 (البنية التحتية + الواجهة الرئيسية)، ثم المرحلتين 3 و 4.

