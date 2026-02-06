
# خطة بناء نظام الأنشطة المتخصصة (Business Verticals)

## الفكرة
بناء نظام متكامل لعرض الحلول المتخصصة لمختلف أنواع الأنشطة التجارية. كل نشاط يبدأ بحالة "قريباً" ويمكن للمالك تفعيله عند جاهزيته مع تحديد السعر والمميزات.

## ما سيتم بناؤه

### 1. جدول جديد في قاعدة البيانات: `business_verticals`
يخزن جميع الأنشطة التجارية المتاحة مع حالتها ومميزاتها:

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid | المعرف |
| name_ar | text | اسم النشاط بالعربية |
| name_en | text | اسم النشاط بالإنجليزية |
| description_ar | text | وصف النشاط بالعربية |
| description_en | text | وصف النشاط بالإنجليزية |
| icon | text | اسم الأيقونة من Lucide |
| color | text | لون التدرج للبطاقة |
| monthly_price | numeric | السعر الشهري |
| yearly_price | numeric | السعر السنوي |
| features_ar | text[] | قائمة المميزات بالعربية |
| features_en | text[] | قائمة المميزات بالإنجليزية |
| status | text | الحالة: coming_soon / active |
| sort_order | integer | ترتيب العرض |
| is_active | boolean | إظهار/إخفاء النشاط |

**سياسات الأمان (RLS):**
- قراءة عامة للأنشطة النشطة (is_active = true)
- إدارة كاملة للمالك (Owner) فقط

**البيانات الأولية - 10 أنشطة تبدأ جميعها بحالة "قريباً":**
1. محلات الذهب والمجوهرات
2. محلات قطع غيار السيارات
3. تجارة إلكترونية
4. محلات الحلاقة (رجالي)
5. صالون تجميل نسائي
6. عيادات طبية
7. صيدليات
8. إدارة أملاك وعقارات
9. مطاعم ومقاهي
10. محلات التجزئة العامة

### 2. صفحة الأنشطة العامة: `/activities`
صفحة مستقلة تحتوي على:

- **شريط التنقل + التذييل** - نفس تصميم صفحة الهبوط
- **عنوان الصفحة** مع وصف تعريفي
- **تبديل شهري/سنوي** - مع badge خصم عند اختيار السنوي
- **شبكة بطاقات الأنشطة** - كل بطاقة تعرض:
  - أيقونة النشاط واسمه ووصفه
  - قائمة المميزات
  - السعر (شهري/سنوي)
  - زر "اشترك الآن" للأنشطة المفعلة
  - badge "قريباً" للأنشطة تحت التطوير (مع تعطيل الزر)

### 3. صفحة إدارة الأنشطة في لوحة المالك: `/owner/activities`
صفحة لإدارة الأنشطة تسمح بـ:
- تعديل اسم ووصف ومميزات كل نشاط (عربي/إنجليزي)
- تعديل الأسعار (شهري/سنوي)
- تغيير الحالة بين "قريباً" و"مفعّل"
- إظهار/إخفاء أي نشاط
- إضافة أنشطة جديدة
- تغيير ترتيب العرض

### 4. تحديث شريط التنقل
إضافة رابط "الأنشطة" في Navbar يوجه إلى `/activities`

### 5. تحديث قسم الأنشطة في صفحة الهبوط
تعديل `ActivitiesSection.tsx` لجعل البطاقات تجلب البيانات من قاعدة البيانات وتكون روابط لصفحة `/activities`

---

## التفاصيل التقنية

### الملفات الجديدة
1. **`src/pages/Activities.tsx`** - صفحة عرض الأنشطة للزوار
2. **`src/pages/owner/OwnerActivities.tsx`** - صفحة إدارة الأنشطة للمالك

### الملفات المعدلة
1. **`src/App.tsx`** - إضافة مسارات `/activities` و `/owner/activities`
2. **`src/components/landing/Navbar.tsx`** - إضافة رابط "الأنشطة"
3. **`src/components/landing/ActivitiesSection.tsx`** - جلب البيانات من DB + روابط
4. **`src/components/owner/OwnerLayout.tsx`** - إضافة رابط إدارة الأنشطة في القائمة الجانبية
5. **`src/i18n/locales/ar.json`** - ترجمات عربية جديدة
6. **`src/i18n/locales/en.json`** - ترجمات إنجليزية جديدة

### تصميم صفحة الأنشطة (`/activities`)

```text
+--------------------------------------------------+
|                   شريط التنقل                      |
+--------------------------------------------------+
|                                                    |
|        الحلول المتخصصة لكل نوع نشاط                |
|   اختر النشاط المناسب لعملك واحصل على نظام        |
|         مصمم خصيصاً لاحتياجاتك                     |
|                                                    |
|         [ شهري ]  [ سنوي - وفر 20% ]              |
|                                                    |
|  +----------+  +----------+  +----------+          |
|  | ذهب      |  | قطع غيار |  | تجارة    |          |
|  | [قريباً] |  | [قريباً] |  | إلكتروني |          |
|  | المميزات |  | المميزات |  | [قريباً] |          |
|  | السعر    |  | السعر    |  | المميزات |          |
|  | [اشترك]  |  | [اشترك]  |  | [اشترك]  |          |
|  +----------+  +----------+  +----------+          |
|                    ...                             |
+--------------------------------------------------+
|                    التذييل                          |
+--------------------------------------------------+
```

- الشاشات الكبيرة: 3 أعمدة
- الشاشات المتوسطة: 2 عمودين
- الموبايل: عمود واحد

### تصميم بطاقة النشاط

- **النشاط المفعّل**: بطاقة كاملة مع زر "اشترك الآن" يوجه لصفحة `/register-company`
- **النشاط "قريباً"**: بطاقة بتأثير شفاف مع badge "قريباً" وزر معطل

### قاعدة البيانات - SQL

```sql
CREATE TABLE public.business_verticals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Store',
  color TEXT DEFAULT 'from-blue-500 to-blue-600',
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  yearly_price NUMERIC NOT NULL DEFAULT 0,
  features_ar TEXT[] DEFAULT ARRAY[]::TEXT[],
  features_en TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'coming_soon',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_verticals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active verticals"
  ON public.business_verticals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Owners can manage verticals"
  ON public.business_verticals FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));
```

### صفحة إدارة الأنشطة (Owner)
تتبع نفس نمط صفحات الإدارة الموجودة (HeroManager, FeaturesManager) مع:
- جدول يعرض كل الأنشطة
- زر تعديل لكل نشاط يفتح Dialog
- زر تبديل الحالة (قريباً / مفعّل)
- زر إضافة نشاط جديد
- إمكانية الإخفاء/الإظهار

### الترجمات المطلوبة
```json
// ar.json
"activities": {
  "title": "الحلول المتخصصة",
  "subtitle": "اختر النشاط المناسب لعملك واحصل على نظام مصمم خصيصاً لاحتياجاتك",
  "monthly": "شهري",
  "yearly": "سنوي",
  "save": "وفر 20%",
  "comingSoon": "قريباً",
  "subscribeNow": "اشترك الآن",
  "underDevelopment": "تحت التطوير",
  "currency": "ر.س",
  "perMonth": "/شهر",
  "perYear": "/سنة"
}
```
