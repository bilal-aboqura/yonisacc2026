

## تعديل نظام الرواتب: استحقاق + تسليم على دفعات

### الفكرة
تحويل نظام الرواتب من خطوة واحدة إلى خطوتين:

1. **الاعتماد (استحقاق)**: قيد لكل موظف — مدين: مصروف الراتب والبدلات، دائن: حساب الموظف
2. **التسليم (دفعات)**: بعد الاعتماد، يمكن تسليم الرواتب على دفعات باختيار موظفين + طريقة دفع — قيد: مدين طريقة الدفع (بنك/صندوق)، دائن حساب الموظف

### التغييرات المطلوبة

#### 1. جدول جديد: `hr_payroll_payments` (migration)
```sql
CREATE TABLE public.hr_payroll_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method_id UUID REFERENCES payment_methods(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

CREATE TABLE public.hr_payroll_payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES hr_payroll_payments(id) ON DELETE CASCADE,
  payroll_item_id UUID NOT NULL REFERENCES hr_payroll_items(id),
  employee_id UUID NOT NULL REFERENCES hr_employees(id),
  amount NUMERIC NOT NULL DEFAULT 0
);
```

أيضاً إضافة عمود `paid_amount` في `hr_payroll_items` لتتبع المبلغ المدفوع لكل موظف:
```sql
ALTER TABLE hr_payroll_items ADD COLUMN paid_amount NUMERIC DEFAULT 0;
```

وتفعيل RLS مع سياسات على `company_id`.

#### 2. تعديل `approvePayrollMutation` في `Payroll.tsx`
- التحقق أن كل موظف محدد لديه `account_id`
- إنشاء **قيد استحقاق لكل موظف**:
  - مدين: حسابات المصروفات (راتب أساسي، سكن، نقل، أخرى)
  - دائن: حساب الموظف (`account_id`) بالصافي
  - دائن: حساب الموظف بخصم السلف (إن وجد) — أو معالجة السلف بشكل منفصل
- تحديث حالة المسير إلى `posted`
- حفظ `is_auto: true, reference_type: "hr"` في القيود للظهور في سجل العمليات

#### 3. واجهة التسليم (بعد الاعتماد) في `Payroll.tsx`
عند عرض مسير معتمد (`posted`):
- إظهار جدول الموظفين مع أعمدة: الصافي، المدفوع، المتبقي
- خانات اختيار للموظفين المتبقي لهم رصيد
- اختيار طريقة الدفع (من `useActivePaymentMethods`)
- تحديد تاريخ الدفع
- زر "تسليم" ينشئ:
  - سجل في `hr_payroll_payments` + `hr_payroll_payment_items`
  - قيد محاسبي: مدين = حساب طريقة الدفع (بنك/صندوق)، دائن = حساب الموظف
  - تحديث `paid_amount` في `hr_payroll_items`
- إظهار سجل الدفعات السابقة أسفل الجدول

#### 4. سجل العمليات
القيود ستُنشأ بـ `is_auto: true, reference_type: "hr"` — يظهرها تلقائياً تحت تبويب "الموارد البشرية" في سجل العمليات (الفلتر موجود بالفعل في سطر 101).

### الملفات المتأثرة
- **Migration SQL** — جدول `hr_payroll_payments` + `hr_payroll_payment_items` + عمود `paid_amount`
- **`src/pages/client/hr/Payroll.tsx`** — تعديل mutation الاعتماد + إضافة واجهة التسليم بدفعات

