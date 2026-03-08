

# خطة نظام ربط طلبات التطبيقات (API Integration) مع نقاط البيع

## الفكرة
إنشاء نظام يسمح بربط تطبيقات التوصيل الخارجية (فودكس، هنقرستيشن، جاهز، مرسول، إلخ) مع مديول نقاط البيع عبر API، بحيث تُنشأ الطلبات تلقائياً في النظام عند استلامها من التطبيق الخارجي.

---

## المرحلة 1 — البنية التحتية

### Migration: جداول التكامل
```sql
-- تطبيقات الربط المعرّفة
CREATE TABLE pos_api_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  provider TEXT NOT NULL, -- 'foodics', 'hungerstation', 'jahez', 'marsool', 'custom'
  provider_name TEXT,     -- اسم مخصص
  api_key UUID DEFAULT gen_random_uuid(), -- مفتاح API للاستقبال
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_accept_orders BOOLEAN DEFAULT false,
  default_order_type TEXT DEFAULT 'delivery',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- طلبات واردة من التطبيقات
CREATE TABLE pos_api_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  integration_id UUID NOT NULL REFERENCES pos_api_integrations(id),
  external_order_id TEXT,    -- رقم الطلب في التطبيق الخارجي
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, preparing, ready, completed, rejected, cancelled
  order_data JSONB NOT NULL,     -- البيانات الخام
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  pos_transaction_id UUID REFERENCES pos_transactions(id), -- ربط بفاتورة POS
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- سجل أحداث الربط
CREATE TABLE pos_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES pos_api_integrations(id),
  order_id UUID REFERENCES pos_api_orders(id),
  event TEXT NOT NULL, -- order_received, order_accepted, order_rejected, sync_error, webhook_received
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Edge Function: `pos-api-webhook`
- استقبال طلبات من التطبيقات الخارجية عبر Webhook
- التحقق من `api_key` في الـ Header
- تحويل بيانات الطلب إلى الشكل الموحد وحفظه في `pos_api_orders`
- إذا `auto_accept_orders = true`، إنشاء `pos_transaction` تلقائياً
- دعم صيغة Foodics webhook + صيغة عامة (Generic)

---

## المرحلة 2 — واجهة إدارة التكاملات

### ملف: `src/pages/client/pos/POSIntegrations.tsx`
صفحة رئيسية بتبويبين:

**تبويب التكاملات:**
- إضافة تكامل جديد (اختيار المزود: فودكس / هنقرستيشن / جاهز / مرسول / مخصص)
- ربط بفرع محدد
- إظهار مفتاح API و Webhook URL للنسخ
- تفعيل/تعطيل + حذف
- إعدادات: قبول تلقائي، نوع الطلب الافتراضي

**تبويب الطلبات الواردة:**
- جدول بالطلبات المستلمة (رقم خارجي، المزود، الحالة، المبلغ، التاريخ)
- إجراءات: قبول / رفض / عرض التفاصيل
- عند القبول → إنشاء فاتورة POS تلقائياً
- فلترة حسب الحالة والتاريخ والمزود

**تبويب السجل:**
- عرض جميع أحداث الربط والأخطاء

---

## المرحلة 3 — ربط فودكس (Foodics)

### تكامل خاص بفودكس:
- صفحة إعداد فودكس تطلب: Business ID + API Token
- Edge Function `pos-foodics-sync` لمزامنة الطلبات
- تحويل بيانات طلبات فودكس إلى الشكل الموحد:
  - ربط المنتجات بالـ SKU
  - تحويل طرق الدفع
  - حساب الضريبة
- إمكانية مزامنة يدوية (Pull) أو تلقائية (Webhook)

---

## ملخص الملفات

| الملف | العملية |
|-------|---------|
| Migration (3 جداول) | إنشاء |
| `supabase/functions/pos-api-webhook/index.ts` | إنشاء |
| `supabase/functions/pos-foodics-sync/index.ts` | إنشاء |
| `src/pages/client/pos/POSIntegrations.tsx` | إنشاء |
| `src/App.tsx` | إضافة مسار |
| `src/components/client/ClientLayout.tsx` | إضافة رابط في قائمة POS |

---

## ملاحظة أمنية
- مفتاح API يُولّد تلقائياً لكل تكامل ويُستخدم للتحقق من الطلبات الواردة
- Webhook URL فريد لكل تكامل
- سجل كامل لكل الأحداث والأخطاء

