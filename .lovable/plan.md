

# خطة: عرض شاشات العميل عند النقر على النشاط في لوحة المالك

## الفكرة
عند الضغط على أي نشاط من صفحة إدارة الأنشطة (`/owner/activities`)، يظهر Dialog يعرض جميع الشاشات والصفحات التي ستكون متاحة للعميل المشترك في هذا النشاط، مقسمة حسب الوحدات (المحاسبة، المبيعات، المخزون، قطع الغيار، إلخ).

## ما سيتم بناؤه

### 1. جدول ربط جديد في قاعدة البيانات: `vertical_screens`
يربط كل نشاط تجاري بالشاشات الخاصة به:

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid | المعرف |
| vertical_id | uuid | FK -> business_verticals |
| screen_id | uuid | FK -> system_screens |
| created_at | timestamptz | تاريخ الإنشاء |

- قيد فريد على (vertical_id, screen_id) لمنع التكرار
- سياسة RLS: القراءة للجميع، الإدارة للمالك فقط

**بيانات أولية:** ربط نشاط "قطع غيار السيارات" بجميع الشاشات الأساسية + شاشات قطع الغيار الثلاث.

### 2. تعديل صفحة إدارة الأنشطة (`OwnerActivities.tsx`)
- إضافة زر "عرض الشاشات" بجوار كل نشاط في جدول الأنشطة
- عند النقر يفتح Dialog كبير يعرض:
  - **القسم العلوي:** معلومات النشاط (الأيقونة، الاسم، الوصف)
  - **القسم الرئيسي:** قائمة شاشات النظام مقسمة حسب الوحدات مع Checkboxes
  - **الشاشات المحددة** (المرتبطة بالنشاط) تظهر بعلامة صح
  - يمكن للمالك تعديل الشاشات المرتبطة بكل نشاط وحفظها

### 3. تصميم الواجهة

```text
+---------------------------------------------+
|    عرض شاشات النشاط                          |
+---------------------------------------------+
|  [Car icon] محلات قطع غيار السيارات           |
|  نظام متخصص لإدارة محلات قطع الغيار          |
+---------------------------------------------+
|                                               |
|  [المحاسبة]  [المبيعات]  [المخزون]  [قطع الغيار]|
|                                               |
|  [x] تحديد الكل                               |
|  ------------------------------------------- |
|  [x] قيود اليومية                             |
|  [x] دفتر الأستاذ                            |
|  [x] ميزان المراجعة                           |
|  [x] قائمة الدخل                              |
|  [x] الميزانية العمومية                       |
|  [x] التدفقات النقدية                         |
|                                               |
+---------------------------------------------+
|        [إلغاء]          [حفظ التغييرات]        |
+---------------------------------------------+
```

---

## التفاصيل التقنية

### الملفات الجديدة
1. **Migration SQL** - إنشاء جدول `vertical_screens` مع البيانات الأولية

### الملفات المعدلة
1. **`src/pages/owner/OwnerActivities.tsx`** - إضافة:
   - زر "الشاشات" في عمود الإجراءات
   - Dialog لعرض وتعديل شاشات النشاط
   - استعلامات لجلب `system_screens` و `vertical_screens`
   - mutation لحفظ التغييرات

### SQL Migration

```sql
-- جدول ربط الأنشطة بالشاشات
CREATE TABLE public.vertical_screens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vertical_id UUID NOT NULL REFERENCES business_verticals(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES system_screens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vertical_id, screen_id)
);

ALTER TABLE public.vertical_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vertical screens"
  ON public.vertical_screens FOR SELECT USING (true);

CREATE POLICY "Owners can manage vertical screens"
  ON public.vertical_screens FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));

-- ربط نشاط قطع الغيار بكل الشاشات الأساسية + شاشات قطع الغيار
INSERT INTO public.vertical_screens (vertical_id, screen_id)
SELECT bv.id, ss.id
FROM business_verticals bv
CROSS JOIN system_screens ss
WHERE bv.name_en = 'Auto Parts Shops';
```

### منطق العمل
- عند فتح Dialog الشاشات، يتم جلب كل شاشات النظام من `system_screens` وتقسيمها حسب `module`
- يتم جلب الشاشات المرتبطة بالنشاط المحدد من `vertical_screens`
- المالك يمكنه تحديد أو إلغاء تحديد أي شاشة
- عند الحفظ: يتم حذف الربط القديم وإدراج الجديد (نفس نمط `OwnerScreens.tsx`)
- واجهة الـ Tabs تعرض الوحدات (المحاسبة، المبيعات، المخزون، الموارد البشرية، قطع الغيار، التقارير، الإعدادات)

