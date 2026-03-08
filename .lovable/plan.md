

# إصلاح خطأ RLS عند حفظ الوحدات

## المشكلة
عند محاولة إدخال سجل جديد في `company_members`، سياسة RLS تتحقق من `is_company_owner(company_id)` — أي أن `auth.uid()` يجب أن يكون مالك الشركة نفسها. لكن مستخدم لوحة الملاك (owner portal) هو **مالك المنصة** وليس مالك شركة المشترك، لذلك الإدراج يُرفض.

## الحل
إضافة سياسة RLS جديدة تسمح لمستخدمي دور `owner` (مالك المنصة) بإدارة سجلات `company_members`:

### 1. Migration — إضافة سياسة RLS
```sql
CREATE POLICY "Platform owner can manage all members"
ON public.company_members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));
```

### 2. لا تغييرات في الكود
الكود الحالي في `ManageCompanyAccess.tsx` صحيح — المشكلة فقط في صلاحيات قاعدة البيانات.

