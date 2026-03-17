

## تحليل المشاكل

### المشكلة 1: نظام الوحدات — الوحدات المحظورة تظهر في لوحة المستخدم

**السبب الجذري**: `useAllowedModules.ts` يبحث عن سجل المستخدم الحالي في جدول `company_members`. إذا كان المستخدم هو **مالك الشركة** وليس لديه سجل في `company_members` (أو السجل لا يحتوي `allowed_modules`)، الهوك يعيد `null` = **كل الوحدات مسموحة**.

بالإضافة لذلك، وحدة **"الخزينة" (`treasury`)** موجودة في لوحة المالك لكنها في القائمة الجانبية مدمجة داخل مجموعة `accounting` — فلا يوجد `moduleKey: "treasury"` مستقل، لذا إيقافها من لوحة المالك لا يؤثر.

أيضاً يوجد **hardcoded user ID** في السطر 451 من `ClientLayout.tsx` وهو مخالف لأفضل ممارسات الأمان.

### المشكلة 2: تسجيل الدخول لا يعمل

**السبب المحتمل**: المستخدم ذكر سابقاً أنه أضاف `VITE_SUPABASE_ANON_KEY` جديد، لكن `client.ts` يستخدم `VITE_SUPABASE_PUBLISHABLE_KEY`. هذا يعني أن المصادقة لا تزال تتصل بـ Lovable Cloud الأصلي. إذا كانت بيانات المستخدم على مشروع مختلف، فلن يتم تسجيل الدخول. بالإضافة لاحتمال وجود race condition في AuthContext.

---

## خطة الإصلاح

### الخطوة 1: إصلاح `useAllowedModules.ts`

عندما لا يوجد سجل `company_members` للمستخدم الحالي، يجب البحث عن `allowed_modules` من أي سجل لنفس الشركة (لأن المالك في لوحة التحكم يحدّث كل أعضاء الشركة). أيضاً إضافة فحص إضافي: إذا كان المستخدم هو `owner_id` للشركة، يبحث عن أي سجل `company_members` لنفس الشركة.

```text
الخطوات:
1. فحص company_members للمستخدم الحالي (كما هو)
2. إذا لم يوجد سجل → فحص أي سجل company_members لنفس الشركة
3. إذا لم يوجد أي سجل → فحص subscription_plans.allowed_modules
4. إذا لم يوجد شيء → null (كل شيء مسموح)
```

### الخطوة 2: إصلاح `handleSaveModules` في `ManageCompanyAccess.tsx`

استخدام `upsert` بدلاً من `insert` الشرطي لضمان وجود سجل للمالك دائماً عند حفظ الوحدات.

### الخطوة 3: إضافة `moduleKey: "treasury"` كمجموعة مستقلة في القائمة الجانبية

فصل الخزينة عن مجموعة المحاسبة وإعطاؤها `moduleKey: "treasury"` مستقل، لتتوافق مع لوحة المالك.

### الخطوة 4: إزالة hardcoded user ID

حذف فحص المستخدم المحدد في السطر 451 من `ClientLayout.tsx`.

### الخطوة 5: إصلاح مشكلة تسجيل الدخول

- إضافة حماية من race condition في `AuthContext.tsx` — التأكد من أن `getSession` يُنفذ أولاً قبل تفعيل أي استعلامات
- التأكد من أن صفحة Auth تتعامل بشكل صحيح مع حالة التحميل وعدم محاولة التوجيه أثناء التحقق من الجلسة
- إضافة logging أفضل لتتبع أخطاء تسجيل الدخول

---

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/hooks/useAllowedModules.ts` | إضافة fallback للبحث عن allowed_modules من أي عضو بالشركة |
| `src/pages/owner/ManageCompanyAccess.tsx` | استخدام upsert لضمان وجود سجل المالك |
| `src/components/client/ClientLayout.tsx` | فصل الخزينة بـ moduleKey مستقل + إزالة hardcoded ID |
| `src/contexts/AuthContext.tsx` | إصلاح race condition وتحسين معالجة الأخطاء |

