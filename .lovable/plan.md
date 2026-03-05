

# تحليل ربط حسابات الفروع وتوصيات التطوير

## الوضع الحالي

جدول `branch_account_settings` يحتوي على الحقول التالية:
- **المبيعات**: `sales_revenue_account_id`, `sales_discount_account_id`, `sales_tax_account_id`, `sales_receivable_account_id`
- **المشتريات**: `purchase_expense_account_id`, `purchase_discount_account_id`, `purchase_tax_account_id`, `purchase_payable_account_id`
- **المخزون**: `inventory_account_id`

`module_type` يقبل فقط `sales` و `purchases` — لا يوجد نوع `inventory` مستقل.

## الفجوات المكتشفة

### 1. حسابات ناقصة في الجدول
الـ RPCs الجديدة (تسوية، تحويل، استهلاك، تصنيع) تحتاج حسابات غير موجودة في `branch_account_settings`:

| العملية | الحساب المطلوب | موجود؟ |
|---------|---------------|--------|
| بيع (COGS) | حساب تكلفة البضاعة المباعة | لا |
| تسوية زيادة | حساب أرباح المخزون (44) | لا |
| تسوية نقص | حساب خسائر المخزون (525) | لا |
| استهلاك داخلي | حساب مصروف الاستهلاك (526) | لا |
| تصنيع | حساب تحت التشغيل WIP (1132) | لا |

الـ RPCs حالياً تبحث عن هذه الحسابات بالكود (مثل `1131`, `511`, `44`) بدل قراءتها من إعدادات الفرع -- مما يعني أن التخصيص حسب الفرع غير مفعّل.

### 2. تاب المخزون يحفظ في `module_type = 'sales'`
في سطر 334 من `BranchAccountSettings.tsx`، زر "حفظ إعدادات المخزون" يستدعي `handleSave("sales")` بدلاً من حفظ سجل منفصل — مما يعني أن حساب المخزون مرتبط بسجل المبيعات فقط.

### 3. `BranchSelector` يشترط وجود `sales` + `purchases` فقط
لا يتحقق من وجود حسابات المخزون/التسويات، مما يسمح بتفعيل فرع بدون ربط كامل.

## خطة التطوير المقترحة

### المرحلة 1: توسيع جدول `branch_account_settings`
إضافة 3 أعمدة جديدة:

```text
cogs_account_id          -> حساب تكلفة البضاعة المباعة
inventory_gain_account_id -> حساب أرباح المخزون (تسوية زيادة)
inventory_loss_account_id -> حساب خسائر المخزون (تسوية نقص)
consumption_expense_account_id -> حساب مصروف الاستهلاك الداخلي
wip_account_id           -> حساب تحت التشغيل (تصنيع)
```

### المرحلة 2: تحديث واجهة `BranchAccountSettings.tsx`
- إضافة الحقول الجديدة في تاب المخزون (بدلاً من حقل واحد فقط)
- إنشاء `module_type = 'inventory'` منفصل للحفظ
- إصلاح زر "حفظ إعدادات المخزون" ليحفظ في `module_type = 'inventory'`
- إضافة حقل COGS في تاب المبيعات

### المرحلة 3: تحديث RPCs لقراءة الحسابات من إعدادات الفرع
تعديل الوظائف الأربع (`rpc_inventory_adjustment`, `rpc_inventory_transfer`, `rpc_inventory_consumption`, `rpc_inventory_manufacturing`) + `post_sales_invoice` لقراءة الحسابات من `branch_account_settings` بدلاً من البحث بالكود الثابت. مع fallback للأكواد الافتراضية.

### المرحلة 4: تحديث `BranchSelector`
التحقق من وجود الإعدادات الثلاث (`sales` + `purchases` + `inventory`) قبل اعتبار الفرع "جاهز".

### ملخص التغييرات

```text
قاعدة البيانات:
  - ALTER TABLE branch_account_settings ADD COLUMN cogs_account_id, 
    inventory_gain_account_id, inventory_loss_account_id,
    consumption_expense_account_id, wip_account_id

  - تحديث RPCs لقراءة الحسابات من الإعدادات

واجهة:
  - BranchAccountSettings.tsx: إضافة الحقول الجديدة + إصلاح الحفظ
  - BranchSelector.tsx: التحقق من 3 module_types
```

