

## إصلاح مشكلة تسجيل الخروج

### المشكلة

من سجلات المصادقة، الخطأ واضح: الجلسة (session) تكون منتهية الصلاحية على الخادم لكن العميل لا يزال يحاول تسجيل الخروج بها. `supabase.auth.signOut()` يفشل بخطأ `session_not_found` (403) **بصمت** — بدون إزالة الجلسة المحلية. النتيجة: المستخدم يضغط "تسجيل خروج" ولا يحدث شيء.

### السبب الجذري

1. `signOut()` في `AuthContext` لا يتعامل مع الأخطاء — إذا فشل طلب الخادم، لا تُمسح البيانات المحلية
2. `onAuthStateChange` لا يُطلق حدث SIGNED_OUT عندما يفشل الطلب
3. الـ auto-logout hook يفاقم المشكلة بمحاولات متكررة

### الإصلاح

**ملف واحد: `src/contexts/AuthContext.tsx`**

تعديل دالة `signOut`:
```typescript
const signOut = async () => {
  // Use 'local' scope to always clear local session
  // even if server-side session is already expired
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  
  // Force clear state regardless of server response
  setUser(null);
  setSession(null);
};
```

باستخدام `scope: 'local'`، يتم مسح الجلسة المحلية (localStorage + state) دائماً بدون الحاجة لاستجابة ناجحة من الخادم. هذا يحل المشكلة بشكل كامل.

