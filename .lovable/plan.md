

## إصلاح عدم ظهور مديول محطات الوقود للمشتركين

### المشكلة

بعد التحقق من البيانات والكود، تبيّن أن المشكلة ناتجة عن **عدم وجود `fuelstation` في باقات الاشتراك**:

| الباقة | يتضمن fuelstation؟ |
|--------|:---:|
| مؤسسات | ❌ |
| مجاني | ❌ |
| أساسي | ❌ |
| متقدم | ✅ |

عند إنشاء مشترك جديد، الدالة `create-subscriber` تحاول **تحديث** سجل `company_members` بـ `allowed_modules` لكن السجل لا يكون موجوداً بعد (لأن `provision_tenant` لا ينشئه)، فيفشل التحديث بصمت. بعدها يعتمد النظام على `allowed_modules` من الباقة — وهي لا تتضمن `fuelstation`.

حتى لو أضاف المالك `fuelstation` يدوياً عبر شاشة إدارة الوصول، عند حفظ الباقة لاحقاً من `OwnerPlans` يتم الكتابة فوق القيم ويُزال `fuelstation` مرة أخرى.

### الإصلاحات المطلوبة

#### 1. تحديث قاعدة البيانات
- إضافة `fuelstation` لمصفوفة `allowed_modules` في **جميع** الباقات النشطة
- إضافة `fuelstation` لجميع سجلات `company_members` الحالية
- تعديل `provision_tenant` لإنشاء سجل `company_members` للمالك تلقائياً

#### 2. إصلاح `create-subscriber` Edge Function
- تغيير منطق حفظ `allowed_modules` من `UPDATE` إلى `UPSERT` (أو INSERT إذا لم يكن موجوداً) لضمان حفظ المديولات المحددة عند إنشاء المشترك

#### 3. تحديث `provision_tenant` (Database Function)
- إضافة `INSERT INTO company_members` لإنشاء سجل للمالك مع `allowed_modules` افتراضية

### الملفات المتأثرة
- **Migration SQL** — تحديث البيانات الحالية + تعديل `provision_tenant`
- **`supabase/functions/create-subscriber/index.ts`** — إصلاح منطق حفظ المديولات

