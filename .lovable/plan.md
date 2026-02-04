
# خطة إضافة فيديو يوتيوب لقسم Hero

## ملخص
سنقوم بإضافة إمكانية عرض فيديو يوتيوب في قسم Hero بدلاً من عرض Dashboard Mockup الحالي، مع تشغيل تلقائي للفيديو عند زيارة الصفحة.

## المتطلبات
1. إضافة حقل `video_url` لجدول `landing_hero` لتخزين رابط الفيديو
2. تعديل مكون `Hero.tsx` لعرض الفيديو بدلاً من الـ Mockup
3. تعديل `HeroManager.tsx` للسماح بتعديل رابط الفيديو من لوحة التحكم

---

## الخطوات التقنية

### 1. تحديث قاعدة البيانات
إضافة عمود جديد لجدول `landing_hero`:
```sql
ALTER TABLE landing_hero 
ADD COLUMN video_url TEXT DEFAULT NULL;
```

### 2. تعديل مكون Hero.tsx

**التغييرات:**
- إضافة `video_url` للـ interface الخاص بـ `HeroData`
- استبدال قسم "Dashboard Mockup" بـ YouTube embed iframe
- استخدام YouTube embed URL مع معاملات التشغيل التلقائي:
  - `autoplay=1` - تشغيل تلقائي
  - `mute=1` - كتم الصوت (مطلوب للتشغيل التلقائي في المتصفحات)
  - `loop=1` - تكرار الفيديو
  - `controls=1` - عرض أزرار التحكم
  - `rel=0` - عدم عرض فيديوهات مقترحة

**مثال على الـ iframe:**
```jsx
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1&loop=1&playlist=VIDEO_ID"
  className="w-full aspect-video rounded-2xl shadow-2xl"
  allow="autoplay; encrypted-media"
  allowFullScreen
/>
```

### 3. تعديل HeroManager.tsx

**إضافة حقل جديد في لوحة التحكم:**
- إضافة `video_url` للـ interface
- إضافة card جديد لإدخال رابط الفيديو
- دعم التحويل التلقائي من روابط YouTube العادية إلى embed URLs

---

## النتيجة المتوقعة
- ✅ فيديو يوتيوب يظهر مكان الـ Dashboard Mockup
- ✅ الفيديو يشتغل تلقائياً عند زيارة الصفحة (مع كتم الصوت)
- ✅ إمكانية تغيير الفيديو من لوحة تحكم المالك
- ✅ تصميم متجاوب يعمل على جميع الأجهزة
- ✅ احتفاظ بالـ Floating Cards الجانبية للجمالية

## ملاحظة هامة
التشغيل التلقائي للفيديو يتطلب كتم الصوت بسبب سياسات المتصفحات الحديثة، لكن المستخدم يمكنه رفع الصوت بالضغط على زر الصوت في مشغل الفيديو.
