

# اصلاح: تمرير نوع النشاط تلقائياً من صفحة الأنشطة إلى التسجيل

## المشاكل المكتشفة

### 1. عدم تمرير نوع النشاط عند الاشتراك
عندما يضغط المستخدم "اشترك الآن" على بطاقة "محلات قطع غيار السيارات" في صفحة الأنشطة (`/activities`)، يتم نقله إلى `/register-company` **بدون أي معلومات عن النشاط الذي اختاره**. المستخدم يضطر لاختيار النشاط يدوياً مرة أخرى، وقد لا ينتبه لذلك.

### 2. المستخدم الجديد ليس لديه شركة
بعد التحقق من قاعدة البيانات، المستخدم الجديد (`costaminehelp@gmail.com`) **لم يُكمل تسجيل الشركة** - لا توجد أي شركة مرتبطة بحسابه. هذا على الأرجح لأن نوع النشاط لم يكن محدداً تلقائياً.

### 3. تضارب في جلب بيانات الشركة
مكوّن `CompanyDropdown` يستخدم `.maybeSingle()` بدون ترتيب، مما قد يُرجع شركة قديمة بدلاً من الأحدث للمستخدمين الذين لديهم عدة شركات.

---

## الحل المقترح

### الاصلاح 1: تمرير نوع النشاط عبر رابط الاشتراك (`Activities.tsx`)
- تغيير الرابط من:
```
/register-company
```
  الى:
```
/register-company?activity=Auto Parts Shops
```
- بحيث ينقل اسم النشاط الإنجليزي كمعامل (query parameter)

### الاصلاح 2: تحديد النشاط تلقائياً في نموذج التسجيل (`CompanyRegistration.tsx`)
- قراءة المعامل `activity` من الرابط عند فتح الصفحة
- تعيينه كقيمة افتراضية لحقل نوع النشاط
- بحيث يجد المستخدم النشاط محدداً مسبقاً عند فتح الصفحة

### الاصلاح 3: إصلاح ترتيب الشركات في CompanyDropdown
- اضافة `.order("created_at", { ascending: false })` قبل `.limit(1)` لضمان إرجاع أحدث شركة

---

## التفاصيل التقنية

### الملفات المعدلة

**1. `src/pages/Activities.tsx`** (سطر 189)
- تغيير رابط "اشترك الآن" لتمرير اسم النشاط:
```typescript
<Link to={`/register-company?activity=${encodeURIComponent(vertical.name_en)}`} className="w-full">
```

**2. `src/pages/CompanyRegistration.tsx`**
- اضافة `useSearchParams` من `react-router-dom`
- قراءة معامل `activity` من الرابط
- تعيين القيمة الافتراضية في `formData.activity_type` عند تحميل الصفحة:
```typescript
const [searchParams] = useSearchParams();
const activityParam = searchParams.get("activity");

// في useEffect: تعيين activity_type اذا جاء من الرابط
useEffect(() => {
  if (activityParam && !formData.activity_type) {
    handleInputChange("activity_type", activityParam);
  }
}, [activityParam]);
```

**3. `src/components/client/CompanyDropdown.tsx`** (سطر 33-36)
- تعديل استعلام الشركة لإضافة ترتيب وحد:
```typescript
const { data, error } = await supabase
  .from("companies")
  .select("*")
  .eq("owner_id", user.id)
  .order("created_at", { ascending: false })
  .limit(1);

return data?.[0] || null;
```
- استبدال `.maybeSingle()` بـ `.limit(1)` مع أخذ أول عنصر

