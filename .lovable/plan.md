

## خطة: نظام نقاط البيع الشامل (POS)

### نطاق العمل
نظام POS متكامل يدعم المطاعم والتجزئة، مع تكامل كامل مع المحاسبة والمخزون. سيتم التنفيذ على مراحل.

---

### المرحلة 1: البنية التحتية وقاعدة البيانات

**Migration — جداول جديدة:**

1. **`pos_terminals`** — نقاط البيع المربوطة بالفروع
   - `id`, `company_id`, `branch_id`, `name`, `name_en`, `terminal_type` (retail/restaurant), `is_active`, `printer_config` (jsonb), `operating_hours` (jsonb), `created_at`

2. **`pos_sessions`** — جلسات الكاشير (فتح/إغلاق)
   - `id`, `company_id`, `branch_id`, `terminal_id`, `opened_by`, `closed_by`, `opening_amount`, `closing_amount`, `expected_amount`, `opened_at`, `closed_at`, `status` (open/closed), `notes`

3. **`pos_transactions`** — عمليات البيع
   - `id`, `company_id`, `branch_id`, `session_id`, `terminal_id`, `transaction_number`, `contact_id`, `subtotal`, `discount_amount`, `tax_amount`, `delivery_fee`, `extra_charges`, `total`, `payment_method`, `paid_amount`, `change_amount`, `table_id`, `order_type` (dine_in/takeaway/delivery), `delivery_app`, `created_by`, `invoice_id`, `created_at`, `status`

4. **`pos_transaction_items`** — أصناف العملية
   - `id`, `transaction_id`, `product_id`, `quantity`, `unit_price`, `discount`, `tax_amount`, `total`, `notes`

5. **`pos_tables`** — الطاولات (للمطاعم)
   - `id`, `company_id`, `branch_id`, `table_number`, `floor_level`, `capacity`, `status` (available/occupied/reserved), `current_transaction_id`, `shape` (square/circle/rectangle), `position_x`, `position_y`

6. **`pos_reservations`** — الحجوزات
   - `id`, `company_id`, `branch_id`, `table_id`, `customer_name`, `phone`, `reservation_date`, `reservation_time`, `party_size`, `deposit_amount`, `status`, `notes`

7. **`pos_menus`** — المنيو المخصص لكل فرع
   - `id`, `company_id`, `branch_id`, `name`, `name_en`, `is_active`

8. **`pos_menu_items`** — أصناف المنيو
   - `id`, `menu_id`, `product_id`, `display_name`, `display_name_en`, `price_override`, `is_available`, `sort_order`, `category_group`

9. **`pos_promotions`** — العروض والخصومات
   - `id`, `company_id`, `name`, `name_en`, `type` (percentage/fixed/buy_x_get_y), `value`, `min_amount`, `start_date`, `end_date`, `is_active`, `applicable_products` (jsonb), `applicable_branches` (jsonb)

10. **`pos_sales_targets`** — تارقت المبيعات
    - `id`, `company_id`, `branch_id`, `user_id`, `target_type` (amount/quantity), `product_id`, `target_value`, `achieved_value`, `period_start`, `period_end`, `notification_interval` (jsonb), `is_active`

11. **`pos_activity_log`** — سجل نشاط المستخدمين
    - `id`, `company_id`, `session_id`, `user_id`, `action`, `details` (jsonb), `created_at`

- إضافة صلاحيات RBAC: `VIEW_POS`, `USE_POS`, `MANAGE_POS`, `MANAGE_POS_TABLES`, `MANAGE_POS_MENUS`, `VIEW_POS_REPORTS`, `MANAGE_POS_PROMOTIONS`, `MANAGE_POS_TARGETS`
- RLS على جميع الجداول بـ `company_id`

---

### المرحلة 2: شاشة POS الرئيسية

**ملف: `src/pages/client/pos/POSScreen.tsx`**
- تصميم ملء الشاشة (Full-screen) بدون sidebar
- **القسم الأيسر (65%)**: 
  - شريط بحث سريع + ماسح باركود
  - تصفية بالتصنيف (أزرار ملونة)
  - شبكة المنتجات (Grid) مع صور وأسعار
  - مؤشر التوفر (متاح/غير متاح)
- **القسم الأيمن (35%)**:
  - سلة المشتريات (كمية، سعر، حذف، ملاحظات)
  - اختيار العميل (اختياري)
  - نوع الطلب (محلي/سفري/توصيل)
  - تطبيق الخصم/العرض
  - رسوم التوصيل
  - الإجماليات (فرعي، ضريبة، خصم، إجمالي)
  - أزرار الدفع (نقد، بطاقة، تحويل، تابي، تمارا)
- **الشريط العلوي**: اسم الفرع، الكاشير، رقم الجلسة، زر إغلاق الصندوق

---

### المرحلة 3: إدارة الطاولات (المطاعم)

**ملف: `src/pages/client/pos/POSTables.tsx`**
- عرض تفاعلي للطاولات حسب الطابق/المستوى
- ألوان حسب الحالة (فارغة/مشغولة/محجوزة)
- الضغط على طاولة يفتح شاشة POS مع ربطها بالطاولة
- إدارة الحجوزات مع التأمينات

---

### المرحلة 4: الإعدادات والمنيو

**ملف: `src/pages/client/pos/POSSettings.tsx`**
- ربط الفروع بنقاط البيع
- إعداد المنيو المخصص لكل فرع
- مواعيد العمل
- إعدادات الطابعة
- شاشة العرض للعملاء
- تخصيص شكل الفاتورة

**ملف: `src/pages/client/pos/POSMenuManager.tsx`**
- إدارة أصناف المنيو لكل فرع
- تفعيل/تعطيل المنتجات
- تغيير الأسعار حسب الفرع

---

### المرحلة 5: العروض والتارقت

**ملف: `src/pages/client/pos/POSPromotions.tsx`**
- إنشاء عروض (نسبة/مبلغ ثابت/اشتر X واحصل Y)
- تحديد فترة العرض والفروع المستهدفة

**ملف: `src/pages/client/pos/POSTargets.tsx`**
- تعيين تارقت لكل كاشير (قيمة/كمية/صنف)
- إشعارات دورية للكاشير بالتقدم

---

### المرحلة 6: التقارير

**ملف: `src/pages/client/pos/POSReports.tsx`**
- تقارير حسب الموظف (أداء كل كاشير)
- تقارير حسب الفرع (مقارنة الأداء)
- تقارير حسب المنتج (الأكثر مبيعاً / الراكد)
- تقارير حسب العميل
- تقرير الإغلاق اليومي
- رسوم بيانية (Recharts)

---

### المرحلة 7: المكونات المساعدة

- `POSSessionDialog.tsx` — فتح/إغلاق الصندوق مع المطابقة
- `POSReceipt.tsx` — إيصال حراري قابل للطباعة
- `POSCustomerDisplay.tsx` — شاشة عرض العميل
- `POSActivityLog.tsx` — سجل نشاط المستخدمين

---

### المرحلة 8: التكامل

- تعديل `App.tsx` — إضافة مسارات POS تحت `/client/pos/*`
- تعديل `ClientLayout.tsx` — إضافة قسم "نقاط البيع" بالقائمة الجانبية مع صلاحية `VIEW_POS`
- ربط كل عملية POS بفاتورة مبيعات وقيد يومية تلقائي
- تحديث المخزون تلقائياً عند إتمام البيع

---

### ملاحظات تقنية
- شاشة POS تستخدم layout مستقل بدون sidebar لتجربة كاشير نظيفة
- دعم اختصارات لوحة المفاتيح (F1-F4 للدفع، Esc للإلغاء)
- دعم الباركود عبر حقل البحث
- جميع الواجهات ثنائية اللغة (عربي/إنجليزي)
- التصميم responsive للأجهزة اللوحية

