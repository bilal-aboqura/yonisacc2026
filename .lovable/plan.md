

## شاشة تجهيز سياسات الإجازات + تقرير أرصدة الإجازات

### الفكرة
إنشاء نظام متكامل لإدارة سياسات الإجازات يتضمن: تعريف أنواع الإجازات واستحقاقاتها، تطبيقها تلقائياً على الموظفين، وتقرير احترافي لأرصدة الإجازات.

### 1. جدول جديد: `hr_leave_policies`
```sql
CREATE TABLE hr_leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  leave_type TEXT NOT NULL,          -- annual, sick, unpaid, emergency
  name TEXT NOT NULL,                -- اسم السياسة بالعربي
  name_en TEXT,                      -- اسم السياسة بالإنجليزي
  annual_entitlement NUMERIC DEFAULT 0, -- الاستحقاق السنوي بالأيام
  carry_over_allowed BOOLEAN DEFAULT false, -- السماح بترحيل الرصيد
  max_carry_over_days NUMERIC DEFAULT 0,    -- أقصى أيام ترحيل
  is_paid BOOLEAN DEFAULT true,      -- مدفوعة أم لا
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. جدول جديد: `hr_leave_balances`
```sql
CREATE TABLE hr_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  employee_id UUID REFERENCES hr_employees(id) NOT NULL,
  leave_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  entitlement NUMERIC DEFAULT 0,   -- الاستحقاق
  used NUMERIC DEFAULT 0,          -- المستخدم
  carried_over NUMERIC DEFAULT 0,  -- المرحّل
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, employee_id, leave_type, year)
);
```

### 3. شاشة جديدة: `LeaveSettings.tsx`
- تعريف سياسات الإجازات (سنوية: 21/30 يوم، مرضية: عدد أيام، اضطرارية، بدون راتب)
- لكل نوع: الاستحقاق السنوي، السماح بالترحيل، أقصى ترحيل، مدفوعة/غير مدفوعة
- زر "تطبيق على جميع الموظفين" لإنشاء أرصدة لكل موظف نشط بناءً على السياسات المعرّفة

### 4. تحديث `Leaves.tsx`
- عند الموافقة على إجازة، يتم خصم الأيام من `hr_leave_balances` للموظف المعني
- عرض الرصيد المتبقي بجانب نوع الإجازة في نموذج الطلب

### 5. تقرير أرصدة الإجازات في `HRReports.tsx`
- تبويب جديد "أرصدة الإجازات" يعرض:
  - فلتر حسب الموظف أو جميع الموظفين + فلتر حسب السنة
  - جدول: الموظف | نوع الإجازة | الاستحقاق | المستخدم | المرحّل | المتبقي
  - دعم التصدير Excel + طباعة
- إمكانية عرض تفاصيل موظف واحد أو كل الموظفين مع إجمالي لكل نوع

### 6. إضافة رابط في القائمة الجانبية
- إضافة "تجهيز الإجازات" / "Leave Settings" في قسم الموارد البشرية بـ `ClientLayout.tsx`
- إضافة Route جديد في `App.tsx`

### الملفات المتأثرة
- **جديد**: `src/pages/client/hr/LeaveSettings.tsx` — شاشة تجهيز السياسات
- **تعديل**: `src/pages/client/hr/Leaves.tsx` — خصم الرصيد عند الموافقة
- **تعديل**: `src/pages/client/hr/HRReports.tsx` — تبويب تقرير الأرصدة
- **تعديل**: `src/components/client/ClientLayout.tsx` — رابط القائمة
- **تعديل**: `src/App.tsx` — Route جديد
- **Migration**: جدولان جديدان + RLS policies

