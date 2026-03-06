

# تطوير نظام ZATCA Phase 2 - مرحلة الربط والتكامل الكاملة

## تحليل الوضع الحالي

النظام يحتوي بالفعل على بنية أساسية جيدة:
- ✅ جداول `zatca_settings` و `zatca_invoice_logs` موجودة
- ✅ Edge functions: `zatca-onboard` و `zatca-submit` موجودة
- ✅ شاشة إعدادات ZATCA موجودة
- ✅ زر إرسال للهيئة في ViewInvoice
- ✅ QR Code بصيغة TLV Base64
- ✅ UUID + ICV + PIH (Hash Chain)
- ✅ UBL 2.1 XML builder
- ✅ دعم Sandbox + Production
- ✅ Multi-company support

## المتطلبات الناقصة (ما سيتم تنفيذه)

| # | المتطلب | الحالة |
|---|---------|--------|
| 1 | **Retry Queue** للفواتير الفاشلة | ❌ غير موجود |
| 2 | **Dashboard متابعة** بإحصائيات تفصيلية | ❌ بسيط جداً |
| 3 | **منع تعديل/حذف** الفواتير بعد الإصدار (Anti-Tampering) | ❌ غير مطبق |
| 4 | **Schema Validation** قبل الإرسال | ❌ غير موجود |
| 5 | **XML محسّن** (QR embedded, Signature placeholders) | ⚠️ بحاجة تحسين |
| 6 | **Device Registration** مع CSID Flow كامل | ⚠️ جزئي |
| 7 | **سجل API Logs** مفصل | ⚠️ جزئي |
| 8 | **إرسال تلقائي** عند تأكيد الفاتورة | ❌ يدوي فقط |
| 9 | **اختيار نوع الفاتورة** (B2B/B2C) عند الإنشاء | ❌ تلقائي فقط |
| 10 | **حفظ XML** مع إمكانية التحميل | ❌ محفوظ لكن غير قابل للتحميل |

---

## التغييرات المطلوبة

### 1. قاعدة البيانات

**جدول جديد: `zatca_retry_queue`** — طابور إعادة الإرسال

| العمود | النوع |
|--------|-------|
| id | uuid PK |
| company_id | uuid FK |
| invoice_id | uuid FK |
| retry_count | integer (default 0) |
| max_retries | integer (default 5) |
| next_retry_at | timestamptz |
| last_error | text |
| status | text (pending/processing/failed/completed) |
| created_at | timestamptz |

**تعديل `invoices`**: إضافة عمود `is_locked boolean DEFAULT false` لمنع التعديل بعد الإرسال.

**RLS**: نفس نمط `is_company_owner`.

### 2. تحسين Edge Function `zatca-submit`

- إضافة **Schema Validation** للتحقق من وجود كل الحقول المطلوبة قبل بناء XML
- إضافة **QR Code** داخل XML كـ `AdditionalDocumentReference`
- تحسين XML: إضافة `UBLExtensions` مع placeholder للتوقيع الرقمي
- عند الفشل: إدراج سجل في `zatca_retry_queue` بدلاً من الفشل الصامت
- قفل الفاتورة (`is_locked = true`) بعد الإرسال الناجح

### 3. Edge Function جديدة: `zatca-retry`

- تعالج الفواتير في `zatca_retry_queue` بحالة `pending`
- تحاول إعادة الإرسال
- تحدث `retry_count` و `next_retry_at` (backoff تصاعدي)
- عند النجاح: تحدث حالة الفاتورة وتحذف من القائمة

### 4. تطوير شاشة `ZatcaSettings.tsx`

إضافة أقسام جديدة:

- **Dashboard إحصائيات**: 4 بطاقات (إجمالي مرسلة، معتمدة، مبلغ عنها، مرفوضة)
- **Retry Queue**: جدول بالفواتير المعلقة مع زر "إعادة إرسال"
- **تحميل XML**: زر تحميل XML لكل فاتورة في سجل الإرسال
- **Device Info**: عرض معرف الجهاز وحالة الشهادة بتفصيل أكبر

### 5. تعديل `CreateSalesInvoice.tsx`

- إضافة **اختيار نوع الفاتورة** (Standard B2B / Simplified B2C)
- عند التأكيد وZATCA مفعل: **إرسال تلقائي** للهيئة
- توليد UUID تلقائياً عند الحفظ

### 6. تعديل `ViewInvoice.tsx`

- عرض **شارة القفل** إذا الفاتورة مقفلة (is_locked)
- إخفاء أزرار التعديل/الحذف للفواتير المقفلة
- إضافة زر **تحميل XML** من zatca_invoice_logs
- عرض UUID وICV في معلومات الفاتورة

### 7. Anti-Tampering في شاشات التعديل

- في `CreateSalesInvoice` (وضع التعديل): منع التعديل إذا `is_locked = true`
- في قائمة المبيعات: إخفاء زر الحذف للفواتير المقفلة

### 8. i18n

إضافة مفاتيح جديدة للـ Retry Queue، Dashboard، والعناصر الجديدة.

---

## ترتيب التنفيذ

1. Database: `zatca_retry_queue` + `invoices.is_locked` + RLS
2. Edge Functions: تحسين `zatca-submit` + إنشاء `zatca-retry`
3. Frontend: `ZatcaSettings.tsx` (dashboard + retry + download XML)
4. Frontend: `CreateSalesInvoice.tsx` (نوع الفاتورة + إرسال تلقائي)
5. Frontend: `ViewInvoice.tsx` (قفل + تحميل XML)
6. i18n

## الملفات

**جديدة (1):**
- `supabase/functions/zatca-retry/index.ts`

**معدلة (6):**
- `supabase/functions/zatca-submit/index.ts`
- `src/pages/client/ZatcaSettings.tsx`
- `src/pages/client/CreateSalesInvoice.tsx`
- `src/pages/client/ViewInvoice.tsx`
- `src/i18n/locales/ar.json`
- `src/i18n/locales/en.json`
- `supabase/config.toml`

