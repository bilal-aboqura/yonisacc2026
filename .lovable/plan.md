

# إضافة تسجيل خروج تلقائي بعد 15 دقيقة من عدم النشاط

## الحل
إنشاء hook جديد `useAutoLogout` يراقب نشاط المستخدم (حركة الماوس، النقر، لوحة المفاتيح، التمرير) ويقوم بتسجيل الخروج تلقائياً بعد 15 دقيقة من عدم وجود أي نشاط.

## الملفات

### 1. إنشاء `src/hooks/useAutoLogout.ts`
- يستمع لأحداث: `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`
- عند كل حدث يُعيد ضبط مؤقت 15 دقيقة
- عند انتهاء المؤقت → يستدعي `signOut()` من `AuthContext`
- يعمل فقط عندما يكون المستخدم مسجل الدخول (`user !== null`)
- ينظف الأحداث والمؤقت عند `unmount`

### 2. تعديل `src/App.tsx`
- إضافة مكوّن داخلي `AutoLogoutWrapper` يستدعي `useAutoLogout()` داخل `AuthProvider` و `BrowserRouter`
- يلف محتوى `Routes` بهذا المكوّن

## التفاصيل التقنية
```text
useAutoLogout:
  - TIMEOUT = 15 * 60 * 1000 (15 دقيقة)
  - events: mousemove, mousedown, keydown, scroll, touchstart
  - على كل event → clearTimeout + setTimeout(signOut, TIMEOUT)
  - cleanup: remove listeners + clearTimeout
  - يعرض toast تحذيري قبل الخروج
```

