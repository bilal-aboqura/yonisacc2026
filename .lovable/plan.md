

## إصلاح خطأ الرقم المكرر + إضافة حالات الاعتماد الجزئي/الكلي

### المشكلة الحالية
1. **خطأ `duplicate key`**: عند الاعتماد، يتم قراءة `next_journal_number` من الإعدادات ثم إنشاء عدة قيود بأرقام متتالية — لكن قد توجد قيود سابقة بنفس الأرقام مما يسبب الخطأ
2. **لا توجد حالات جزئي/كلي**: الحالة تتحول مباشرة من `draft` إلى `posted` بغض النظر عن عدد الموظفين المعتمدين

### الحل

#### تعديل `Payroll.tsx`:

**1. إصلاح ترقيم القيود:**
- بدلاً من الاعتماد فقط على `company_settings.next_journal_number`، نجلب أيضاً أقصى رقم موجود فعلياً في `journal_entries` ونبدأ من الأكبر بينهما
```typescript
const { data: maxEntry } = await supabase
  .from("journal_entries")
  .select("entry_number")
  .eq("company_id", companyId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
// Extract number from max entry and compare with settings
```

**2. إضافة حالات الاعتماد:**
- `draft` → مسودة
- `partially_posted` → معتمد جزئياً (تم اعتماد بعض الموظفين)
- `posted` → معتمد بالكامل (كل الموظفين لديهم قيود استحقاق)
- بعد الاعتماد: نتحقق إذا كان كل الموظفين في المسير تم اعتمادهم ← `posted`، وإلا ← `partially_posted`

**3. تتبع الموظفين المعتمدين:**
- إضافة عمود `is_approved` في `hr_payroll_items` (boolean, default false)
- عند اعتماد موظفين محددين: نحدثهم إلى `is_approved = true`
- في الواجهة: إخفاء الموظفين المعتمدين من قائمة التحديد + إظهار حالتهم

**4. منع الاعتماد الكلي المكرر:**
- إذا كانت الحالة `posted` (معتمد بالكامل) → لا يظهر زر الاعتماد

**5. تحديث `statusBadge`:**
- إضافة شارة "معتمد جزئياً" بلون أزرق
- في حالة المعتمد جزئياً: يظهر زر الاعتماد للموظفين المتبقين فقط

### التغييرات
- **Migration**: إضافة عمود `is_approved BOOLEAN DEFAULT false` في `hr_payroll_items`
- **`src/pages/client/hr/Payroll.tsx`**: إصلاح الترقيم + حالات الاعتماد + تصفية الموظفين

