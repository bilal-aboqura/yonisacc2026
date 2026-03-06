

# خطة تنفيذ اشتراطات المرحلة الثانية لهيئة الزكاة والدخل (ZATCA Phase 2)

## الهدف
إضافة دعم كامل للفوترة الإلكترونية المرحلة الثانية (مرحلة الربط والتكامل) مع بوابة فاتورة، بحيث تتمكن كل شركة من إدخال بيانات الربط الخاصة بها وإصدار فواتير متوافقة.

---

## المتطلبات التقنية للمرحلة الثانية

| العنصر | الوصف |
|--------|-------|
| **UUID** | معرف فريد عالمي لكل فاتورة |
| **ICV** | عداد تسلسلي لا يُعاد تصفيره |
| **PIH** | هاش الفاتورة السابقة (سلسلة تشفيرية) |
| **XML UBL 2.1** | صيغة الفاتورة الإلكترونية |
| **Cryptographic Stamp** | ختم تشفيري من هيئة الزكاة |
| **CSID** | شهادة الربط (Compliance + Production) |
| **B2B Clearance** | اعتماد فوري من الهيئة قبل إرسالها للعميل |
| **B2C Reporting** | إبلاغ خلال 24 ساعة |

---

## التغييرات المطلوبة

### 1. جدول جديد: `zatca_settings` — إعدادات الربط لكل شركة

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| company_id | uuid FK (unique) | شركة واحدة = سجل واحد |
| is_enabled | boolean | تفعيل الربط |
| environment | text | `sandbox` أو `production` |
| otp | text | رمز OTP من بوابة فاتورة |
| compliance_csid | text | شهادة الامتثال (مشفرة) |
| production_csid | text | شهادة الإنتاج (مشفرة) |
| private_key | text | المفتاح الخاص (مشفر) |
| icv_counter | integer | عداد الفواتير الحالي |
| last_invoice_hash | text | هاش آخر فاتورة (PIH) |
| seller_name | text | اسم البائع |
| vat_number | text | الرقم الضريبي |
| building_number | text | رقم المبنى |
| street | text | الشارع |
| district | text | الحي |
| city | text | المدينة |
| postal_code | text | الرمز البريدي |
| country_code | text | `SA` |
| created_at / updated_at | timestamptz | |

**RLS**: `is_company_owner(company_id)` for ALL + SELECT

### 2. جدول جديد: `zatca_invoice_logs` — سجل ربط الفواتير مع الهيئة

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| invoice_id | uuid FK → invoices | |
| uuid | text | UUID الفاتورة |
| icv | integer | قيمة العداد |
| pih | text | هاش الفاتورة السابقة |
| invoice_hash | text | هاش هذه الفاتورة |
| xml_content | text | محتوى XML الكامل |
| qr_code | text | رمز QR المشفر |
| submission_status | text | `pending/cleared/reported/rejected` |
| zatca_response | jsonb | رد الهيئة الكامل |
| invoice_type | text | `standard` (B2B) أو `simplified` (B2C) |
| submitted_at | timestamptz | |
| created_at | timestamptz | |

**RLS**: `is_company_owner(company_id)`

### 3. أعمدة جديدة في جدول `invoices`

```sql
ALTER TABLE invoices ADD COLUMN zatca_uuid text;
ALTER TABLE invoices ADD COLUMN zatca_status text DEFAULT 'not_submitted';
-- values: not_submitted, pending, cleared, reported, rejected
```

### 4. Edge Function: `zatca-onboard` — عملية الربط

- يستقبل: `company_id`, `otp`
- ينشئ CSR (Certificate Signing Request)
- يرسل طلب Compliance CSID لبوابة فاتورة (Sandbox أو Production)
- يحفظ الشهادة والمفتاح الخاص في `zatca_settings`

### 5. Edge Function: `zatca-submit` — إرسال الفاتورة

- يستقبل: `company_id`, `invoice_id`
- يقرأ بيانات الفاتورة والشركة والعميل
- يولّد XML بصيغة UBL 2.1
- يحسب UUID, ICV, PIH
- يوقع الفاتورة بالختم التشفيري
- يرسل للهيئة:
  - **B2B**: Clearance API (اعتماد فوري)
  - **B2C**: Reporting API (إبلاغ خلال 24 ساعة)
- يحفظ النتيجة في `zatca_invoice_logs`
- يحدث `invoices.zatca_status`

### 6. شاشة جديدة: إعدادات الفوترة الإلكترونية (ZATCA Settings)

**المسار**: `/client/settings/zatca` — تاب جديد في الإعدادات

**المحتوى**:
- **حالة الربط**: بطاقة تعرض (غير مربوط / بيئة اختبار / بيئة إنتاج)
- **بيانات البائع**: الاسم، الرقم الضريبي، العنوان المفصل (مبنى، شارع، حي، مدينة، رمز بريدي)
- **إعدادات الربط**: اختيار البيئة (Sandbox/Production) + إدخال OTP + زر "ربط مع الهيئة"
- **معلومات الشهادة**: عرض حالة CSID (صالحة/منتهية)
- **سجل الإرسال**: جدول بآخر الفواتير المرسلة وحالتها

### 7. تعديل شاشة عرض الفاتورة (`ViewInvoice.tsx`)

- إضافة **شارة حالة ZATCA** (غير مرسلة / معتمدة / مبلغ عنها / مرفوضة)
- زر **"إرسال للهيئة"** للفواتير المؤكدة غير المرسلة
- تحديث **رمز QR** ليشمل بيانات Phase 2 (UUID, الختم التشفيري)
- عرض UUID وICV في تفاصيل الفاتورة

### 8. تعديل إنشاء الفاتورة (`CreateSalesInvoice.tsx`)

- توليد UUID تلقائي عند الإنشاء
- عند التأكيد: إرسال تلقائي للهيئة إذا كان الربط مفعلاً
- اختيار نوع الفاتورة (ضريبية قياسية B2B / ضريبية مبسطة B2C)

### 9. تحديث Sidebar

- إضافة تاب "الفوترة الإلكترونية" في قائمة الإعدادات

### 10. i18n

إضافة مفاتيح عربية وإنجليزية لجميع العناصر الجديدة.

---

## ترتيب التنفيذ

1. **قاعدة البيانات**: إنشاء `zatca_settings` + `zatca_invoice_logs` + تعديل `invoices` + RLS
2. **Edge Functions**: `zatca-onboard` + `zatca-submit`
3. **شاشة الإعدادات**: `/client/settings/zatca`
4. **تعديل الفواتير**: ViewInvoice + CreateSalesInvoice
5. **Sidebar + i18n**

## الملفات

**ملفات جديدة (4):**
- `src/pages/client/ZatcaSettings.tsx`
- `supabase/functions/zatca-onboard/index.ts`
- `supabase/functions/zatca-submit/index.ts`
- `src/lib/zatcaUtils.ts` (XML builder + hash utilities)

**ملفات معدلة (5):**
- `src/pages/client/ViewInvoice.tsx`
- `src/pages/client/CreateSalesInvoice.tsx`
- `src/pages/client/ClientSettings.tsx`
- `src/components/client/ClientLayout.tsx`
- `src/i18n/locales/ar.json` + `en.json`

