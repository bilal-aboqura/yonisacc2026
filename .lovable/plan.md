

## تأمين حذف السلف: حذف القيد المرتبط + منع الحذف عند وجود خصومات

### التغييرات في `src/pages/client/hr/Loans.tsx`

#### 1. منع الحذف إذا تم خصم أي مبلغ من السلفة في مسيرات الرواتب
- قبل الحذف: التحقق من `total_paid > 0` (أي تم خصم مبالغ عبر الرواتب)
- إذا كان `total_paid > 0` → رفض الحذف مع رسالة توضيحية: "لا يمكن حذف السلفة لوجود خصومات مرتبطة بمسيرات رواتب"

#### 2. حذف القيد المحاسبي المرتبط عند حذف السلفة
- عند الإنشاء، القيد يُسجل بـ `reference_type: "hr_loan"` — لكن لا يوجد ربط مباشر بـ `loan_id`
- الحل: البحث عن القيد المرتبط عبر:
  - `reference_type = 'hr_loan'`
  - `entry_date = loan.start_date`
  - `total_debit = loan.amount`
  - `company_id`
  - `is_auto = true`
- حذف `journal_entry_lines` أولاً ثم `journal_entries` للقيد المطابق
- تحديث `next_journal_number` غير مطلوب (الأرقام لا تُعاد)

#### 3. تحديث واجهة الحذف
- في `AlertDialogDescription`: إضافة تنبيه بأن القيد المحاسبي المرتبط سيُحذف أيضاً
- تعطيل خيار الحذف (disabled + tooltip) إذا `total_paid > 0`

### ملخص التدفق
```text
حذف سلفة
  ├─ total_paid > 0? → رفض "لا يمكن الحذف - يوجد خصومات"
  └─ total_paid = 0
       ├─ حذف journal_entry_lines للقيد المرتبط
       ├─ حذف journal_entries للقيد المرتبط
       └─ حذف hr_loans
```

### الملف المتأثر
- `src/pages/client/hr/Loans.tsx` — تعديل `deleteMutation` + تحديث واجهة الحذف

