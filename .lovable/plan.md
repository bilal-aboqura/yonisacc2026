

## إصلاح زر الحفظ عند تفعيل "تم إصدار الإقامة"

### المشكلة
في سطر 212، شرط `canSave` يتحقق من `form.iqama_number` بينما حقل الإدخال (سطر 351) يكتب في `form.national_id`. لذلك رغم إدخال رقم الهوية، الشرط يظل `false` لأن `iqama_number` فارغ.

### الحل
تعديل سطر 212 في `EmployeeForm.tsx`:
```typescript
// قبل
const canSave = form.name && form.employee_number && (!form.has_iqama || (form.iqama_number && form.iqama_expiry));

// بعد
const canSave = form.name && form.employee_number && (!form.has_iqama || (form.national_id && form.iqama_expiry));
```

### الملف المتأثر
- `src/components/hr/EmployeeForm.tsx` — سطر واحد فقط

