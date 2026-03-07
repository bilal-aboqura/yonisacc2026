

# خطة تطوير نقاط البيع - كوبونات، عروض، مستخدمين، تقارير الصندوق

## ملخص التغييرات

سيتم تنفيذ 7 مهام رئيسية: نظام كوبونات، ربط العروض بمنتجات محددة مع شاشة داخلية، شاشة مستخدمي POS بأدوار (كاشير/مدير فرع)، تقييد الوصول لشاشة البيع فقط، تقرير إغلاق الصندوق، وسجل المستخدمين.

---

## 1. قاعدة البيانات (Migrations)

### جدول الكوبونات `pos_coupons`
```text
id, company_id, code (unique per company), name, name_en,
discount_type (percentage/fixed), discount_value,
min_order_amount, max_uses, used_count (default 0),
start_date, end_date, is_active, created_at
+ RLS by company_id
```

### جدول ربط العروض بالمنتجات `pos_promotion_products`
```text
id, promotion_id (FK pos_promotions), product_id (FK products),
company_id, created_at
+ RLS by company_id
```

### جدول مستخدمي POS `pos_users`
```text
id, company_id, user_id (FK auth.users), branch_id (FK branches),
role ('cashier' | 'branch_manager'), display_name,
is_active (default true), created_at
+ RLS by company_id
```

### تعديل `pos_sessions` - إضافة أعمدة التقرير
```text
ADD total_sales, total_returns, total_discounts,
    total_promotions, payment_summary (JSONB),
    closing_report_printed (boolean default false)
```

---

## 2. الملفات المطلوب إنشاؤها/تعديلها

### ملفات جديدة:
- **`src/pages/client/pos/POSCoupons.tsx`** - شاشة إدارة الكوبونات (CRUD مع كود الكوبون، نوع الخصم، الحد الأقصى للاستخدام، الفترة)
- **`src/pages/client/pos/POSUsers.tsx`** - شاشة إدارة مستخدمي نقاط البيع (إنشاء مستخدم بإيميل+باسورد+فرع+دور، جدول المستخدمين)
- **`src/pages/client/pos/POSUserLogs.tsx`** - سجل المستخدمين (تقرير يعرض: وقت الدخول/الخروج، المبيعات، المرتجعات، الخصومات، رصيد الإغلاق، المدفوعات حسب طريقة الدفع)

### ملفات معدّلة:
- **`src/pages/client/pos/POSPromotions.tsx`** - تحويل من Dialog منبثق إلى شاشة داخلية (inline form) مع إضافة اختيار منتجات محددة عند إنشاء/تعديل العرض
- **`src/pages/client/pos/POSScreen.tsx`** - إضافة:
  - تطبيق الكوبون في السلة (حقل إدخال الكوبون)
  - عند إغلاق الصندوق: حساب الملخص وعرض تقرير مفصل مع إمكانية الطباعة قبل الإغلاق
  - التحقق من أن المستخدم مسجل في `pos_users` قبل السماح بالدخول
- **`src/components/client/ClientLayout.tsx`** - إضافة عنصرين في sidebar: "الكوبونات" و"المستخدمين" و"سجل المستخدمين"
- **`src/App.tsx`** - إضافة routes جديدة: `pos/coupons`, `pos/users`, `pos/user-logs`

---

## 3. تفاصيل المنطق

### الكوبونات
- كود فريد لكل شركة، يتم التحقق منه في POS عبر حقل إدخال
- عند إدخال كود صالح: يُطبّق الخصم (نسبة أو مبلغ ثابت) ويُزاد `used_count`
- التحقق من: الفترة، الحد الأقصى للاستخدام، الحد الأدنى للطلب

### العروض على منتجات محددة
- عند إنشاء عرض: إظهار قائمة المنتجات مع checkboxes لاختيار المنتجات المرتبطة
- تخزين الربط في `pos_promotion_products`
- الشاشة تكون inline (قسمين: قائمة العروض + نموذج التعديل/الإنشاء)

### مستخدمو POS
- إنشاء مستخدم: إيميل + باسورد + اختيار فرع + اختيار دور (كاشير/مدير فرع)
- يتم إنشاء حساب عبر Supabase Auth ثم ربطه في `pos_users`
- المستخدم المنشأ يدخل مباشرة إلى `/client/pos` فقط (بدون sidebar كامل)

### تقرير إغلاق الصندوق
- عند الضغط على "إغلاق الصندوق": يُحسب من `pos_transactions` للجلسة الحالية:
  - إجمالي المبيعات (status=completed)
  - إجمالي المرتجعات (status=refunded)
  - إجمالي الخصومات والعروض
  - المدفوعات مجمّعة حسب طريقة الدفع
  - رصيد الصندوق = opening_amount + cash_sales - cash_refunds
- يُعرض تقرير قابل للطباعة قبل تأكيد الإغلاق

### سجل المستخدمين
- جدول يعرض جميع الجلسات المغلقة مع بيانات كل جلسة
- فلترة بالتاريخ والمستخدم والفرع

---

## 4. الأمان
- جميع الجداول الجديدة بسياسات RLS مرتبطة بـ `company_id`
- مستخدمو POS لا يمكنهم الوصول لأي شاشة غير شاشة البيع (يتم التحقق في `POSScreen` وتوجيههم تلقائياً)

