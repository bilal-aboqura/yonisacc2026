

## المشكلة الرئيسية: التطبيق يتصل بقاعدة بيانات خاطئة

بناءً على طلبات الشبكة، التطبيق يحاول الاتصال بـ `mxleuvcnnmzzmyilqabi.supabase.co` وهو مشروع خارجي مختلف عن Lovable Cloud (`xnkhnelsuzhdzylzywbq`). كل الطلبات تفشل بخطأ **"Invalid API key"**.

هذا هو السبب في:
- **فشل تسجيل الدخول** — التطبيق يحاول المصادقة مع مشروع خارجي بمفتاح خاطئ
- **مشاكل الوحدات** — لا يمكن قراءة أي بيانات من قاعدة البيانات

### السبب
يبدو أن متغيرات البيئة `VITE_SUPABASE_URL` و/أو `VITE_SUPABASE_PUBLISHABLE_KEY` تم تغييرها في وقت سابق لتشير إلى مشروع خارجي. ملف `.env` الحالي يحتوي على القيم الصحيحة لـ Lovable Cloud لكن المعاينة لا تزال تستخدم القيم القديمة.

### هام
هذا المشروع يعمل على **Lovable Cloud** — لا يمكن إعادة توجيهه لمشروع Supabase خارجي. كل الجداول، السياسات، الدوال، والبيانات موجودة بالفعل في Lovable Cloud.

---

## خطة الإصلاح

### الخطوة 1: إعادة الاتصال بـ Lovable Cloud
- التأكد من أن ملف `client.ts` يقرأ من `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY` (وهو كذلك حالياً)
- التأكد من أن `.env` يحتوي على القيم الصحيحة لـ Lovable Cloud (وهي كذلك حالياً)
- المشكلة على الأرجح أن المعاينة تحتاج إعادة بناء لتلتقط القيم الصحيحة

### الخطوة 2: إصلاح نظام الوحدات (بعد عودة الاتصال)
- تعديل `useAllowedModules.ts` لدعم المالك الذي ليس لديه سجل في `company_members`
- إضافة `moduleKey: "treasury"` كوحدة مستقلة في القائمة الجانبية
- تعديل `ManageCompanyAccess.tsx` لضمان إنشاء سجل للمالك عند حفظ الوحدات

### الملفات المتأثرة
| الملف | التغيير |
|---|---|
| `src/hooks/useAllowedModules.ts` | إضافة fallback للمالك |
| `src/components/client/ClientLayout.tsx` | فصل الخزينة بـ moduleKey مستقل |
| `src/pages/owner/ManageCompanyAccess.tsx` | upsert لسجل المالك |

