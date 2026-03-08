

# إصلاح الشاشات المخفية والصلاحيات الناقصة

## المشكلات المكتشفة

### 1. شاشات مسجلة في الراوتر لكنها مخفية من القائمة الجانبية
| الشاشة | المسار | السبب |
|--------|--------|-------|
| **دليل الحسابات** (Chart of Accounts) | `/client/accounts` | غير مضافة في قائمة المحاسبة |
| **جهات الاتصال** (Contacts) | `/client/contacts` | غير مضافة في أي قائمة |

### 2. مديولات بدون صلاحيات في `rbac_permissions`
هذه المديولات موجودة في القائمة الجانبية لكن **لا توجد لها أي صلاحيات** في جدول `rbac_permissions`، مما يجعل تبويب الصلاحيات في لوحة الملاك فارغاً لها:
- **clinic** (العيادة)
- **realestate** (العقارات)
- **delivery** (التوصيل)
- **assets** (الأصول الثابتة)

هذه المديولات تستخدم حالياً صلاحيات عامة مثل `VIEW_ACCOUNTS` بدلاً من صلاحيات خاصة بها.

---

## الحل

### ملف 1: `src/components/client/ClientLayout.tsx`
- إضافة **دليل الحسابات** (`/client/accounts`, permission: `VIEW_ACCOUNTS`) في مجموعة المحاسبة
- إضافة **جهات الاتصال** (`/client/contacts`, permission: `VIEW_CONTACTS`) كعنصر مستقل أو ضمن الإعدادات

### ملف 2: Migration — إضافة صلاحيات المديولات الناقصة
```sql
INSERT INTO rbac_permissions (code, module, description, description_ar) VALUES
-- Assets
('VIEW_ASSETS', 'assets', 'View Fixed Assets', 'عرض الأصول الثابتة'),
('MANAGE_ASSETS', 'assets', 'Manage Fixed Assets', 'إدارة الأصول الثابتة'),
('RUN_DEPRECIATION', 'assets', 'Run Depreciation', 'تشغيل الإهلاك'),
-- Clinic
('VIEW_CLINIC', 'clinic', 'View Clinic', 'عرض العيادة'),
('MANAGE_PATIENTS', 'clinic', 'Manage Patients', 'إدارة المرضى'),
('MANAGE_DOCTORS', 'clinic', 'Manage Doctors', 'إدارة الأطباء'),
('MANAGE_APPOINTMENTS', 'clinic', 'Manage Appointments', 'إدارة المواعيد'),
('MANAGE_PRESCRIPTIONS', 'clinic', 'Manage Prescriptions', 'إدارة الوصفات'),
('VIEW_CLINIC_BILLING', 'clinic', 'View Clinic Billing', 'عرض فوترة العيادة'),
('VIEW_CLINIC_REPORTS', 'clinic', 'View Clinic Reports', 'عرض تقارير العيادة'),
-- Real Estate
('VIEW_REALESTATE', 'realestate', 'View Real Estate', 'عرض العقارات'),
('MANAGE_PROPERTIES', 'realestate', 'Manage Properties', 'إدارة العقارات'),
('MANAGE_TENANTS', 'realestate', 'Manage Tenants', 'إدارة المستأجرين'),
('MANAGE_LEASES', 'realestate', 'Manage Leases', 'إدارة عقود الإيجار'),
('MANAGE_RENT_INVOICES', 'realestate', 'Manage Rent Invoices', 'إدارة فواتير الإيجار'),
('VIEW_REALESTATE_REPORTS', 'realestate', 'View Real Estate Reports', 'عرض تقارير العقارات'),
-- Delivery
('VIEW_DELIVERY', 'delivery', 'View Delivery', 'عرض التوصيل'),
('MANAGE_DELIVERY_ORDERS', 'delivery', 'Manage Delivery Orders', 'إدارة طلبات التوصيل'),
('MANAGE_DRIVERS', 'delivery', 'Manage Drivers', 'إدارة السائقين'),
('MANAGE_DELIVERY_AREAS', 'delivery', 'Manage Delivery Areas', 'إدارة مناطق التوصيل'),
('DRIVER_SETTLEMENT', 'delivery', 'Driver Settlement', 'تقفيل حساب السائقين'),
('VIEW_DELIVERY_REPORTS', 'delivery', 'View Delivery Reports', 'عرض تقارير التوصيل');
```

### ملف 3: `src/components/client/ClientLayout.tsx` — تحديث permission codes
تحديث مجموعات القوائم (assets, clinic, realestate, delivery) لاستخدام أكواد الصلاحيات الجديدة بدلاً من `VIEW_ACCOUNTS`.

### ملف 4: تحديث `moduleLabels` في `ManageCompanyAccess.tsx`
إضافة المديولات الناقصة في قاموس التسميات:
- `assets`, `clinic`, `realestate`, `delivery`

---

## ملخص التغييرات
| الملف | نوع التغيير |
|-------|------------|
| `ClientLayout.tsx` | إضافة شاشتين + تحديث permission codes |
| Migration SQL | إضافة ~22 صلاحية جديدة |
| `ManageCompanyAccess.tsx` | إضافة 4 مديولات في moduleLabels |

