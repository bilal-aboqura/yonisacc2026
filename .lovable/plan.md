

# خطة تطوير مديول المخزون المتكامل

## الوضع الحالي
- جداول موجودة: `products`, `product_categories` (شجرية), `product_stock`, `stock_movements`, `warehouses`, `units` (بدون تحويلات)
- الجداول الناقصة: `stock_adjustments`, `stock_transfers`, `internal_consumptions`, `bill_of_materials`, `manufacturing_orders`, تحويل الوحدات، أنواع المنتجات، طرق التتبع
- الواجهة الحالية: صفحة منتجات بسيطة + صفحة إنشاء منتج + حركة مخزون فارغة
- القائمة الجانبية: رابطان فقط (المنتجات، حركة المخزون)

## خطة التنفيذ (مقسمة على مراحل)

### المرحلة 1: تحديث قاعدة البيانات

**تعديل جدول `units`** — إضافة:
- `symbol` (موجود)، `allows_fractions` (boolean)، `base_unit_id` (uuid FK → units)، `conversion_rate` (numeric)

**تعديل جدول `products`** — إضافة:
- `product_type` (text: stock/service/manufacturing/bundle)
- `tracking_method` (text: none/batch/serial)
- `unit_id` (uuid FK → units)
- `is_taxable` (boolean, default true)
- `reorder_level` (integer)

**تعديل جدول `product_categories`** — إضافة:
- `image_url` (text)

**جدول جديد: `stock_adjustments`**
- id, company_id, branch_id, adjustment_date, adjustment_type (increase/decrease), reason, status (draft/approved), notes, created_by, approved_by, created_at

**جدول جديد: `stock_adjustment_items`**
- id, adjustment_id, product_id, quantity, unit_cost, notes

**جدول جديد: `stock_transfers`**
- id, company_id, from_branch_id, to_branch_id, transfer_date, status (draft/sent/received), notes, created_by, received_by, created_at

**جدول جديد: `stock_transfer_items`**
- id, transfer_id, product_id, quantity_sent, quantity_received, notes

**جدول جديد: `internal_consumptions`**
- id, company_id, branch_id, consumption_date, department, reason, status, notes, created_by, created_at

**جدول جديد: `internal_consumption_items`**
- id, consumption_id, product_id, quantity, unit_cost, notes

**جدول جديد: `bill_of_materials`**
- id, company_id, product_id (المنتج النهائي), is_active, notes, created_at

**جدول جديد: `bom_items`**
- id, bom_id, product_id (مادة خام), quantity, unit_id

**جدول جديد: `manufacturing_orders`**
- id, company_id, branch_id, bom_id, product_id, quantity, status (draft/in_progress/completed/cancelled), production_cost, notes, created_by, completed_at, created_at

**RLS**: جميع الجداول ستستخدم `is_company_owner(company_id)` مع Realtime على `product_stock` و `stock_movements`.

### المرحلة 2: الواجهات الأمامية

**1. إدارة الوحدات** — `/client/inventory/units`
- CRUD وحدات مع دعم التحويل والكسور

**2. إدارة التصنيفات** — `/client/inventory/categories`
- شجرة تصنيفات مع إضافة/تعديل/حذف + صورة + تفعيل/تعطيل

**3. تطوير المنتجات** — تحديث `CreateProduct` و إنشاء `EditProduct`
- إضافة نوع المنتج، طريقة التتبع، ربط الوحدة من جدول الوحدات، خاضع للضريبة

**4. كرت المنتج** — `/client/inventory/product/:id`
- الرصيد بكل فرع، متوسط التكلفة، قيمة المخزون، سجل الحركات (Stock Ledger)

**5. عرض المخزون (Stock Overview)** — `/client/inventory/stock`
- جدول بجميع المنتجات مع الكميات وفلترة بالفرع/التصنيف/تحت الحد الأدنى

**6. تسوية المخزون** — `/client/inventory/adjustments`
- إنشاء تسوية (زيادة/نقص) مع السبب والفرع، تحديث `product_stock` و `stock_movements`

**7. تحويل بين الفروع** — `/client/inventory/transfers`
- إنشاء طلب تحويل (Draft → Sent → Received)، تحديث المخزون عند الاستلام

**8. الاستهلاك الداخلي** — `/client/inventory/consumptions`
- صرف منتجات لاستخدام داخلي مع القسم والسبب

**9. التصنيع** — `/client/inventory/manufacturing`
- إدارة BOM + أوامر التصنيع مع خصم المواد وإضافة المنتج النهائي

**10. تقارير المخزون** — `/client/inventory/reports`
- 7 تقارير مع فلترة بالفرع والفترة + تصدير PDF/Excel

### المرحلة 3: التكامل

- **القائمة الجانبية**: توسيع قسم المخزون ليشمل جميع الروابط الجديدة
- **RBAC**: إضافة أكواد صلاحيات جديدة (VIEW_UNITS, MANAGE_UNITS, VIEW_CATEGORIES, MANAGE_ADJUSTMENTS, إلخ)
- **Audit Log**: تسجيل جميع العمليات عبر triggers
- **Realtime**: تفعيل `supabase_realtime` على `product_stock`
- **i18n**: إضافة جميع النصوص في `ar.json` و `en.json`
- **منع تعديل المعتمد**: العمليات المعتمدة (approved/completed/received) لا تقبل التعديل

## ملاحظة مهمة
هذا المديول ضخم جداً (10+ شاشة، 10+ جدول جديد، RPCs). سأبدأ بالتنفيذ على مراحل — الجداول أولاً، ثم الشاشات الأساسية (الوحدات، التصنيفات، المنتجات المطورة)، ثم العمليات (تسوية، تحويل، استهلاك، تصنيع)، وأخيراً التقارير.

