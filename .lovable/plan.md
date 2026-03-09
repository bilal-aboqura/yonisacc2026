

## إصلاح سجل الحركات الفارغ

### السبب
الاستعلام يفشل بخطأ `PGRST201` (HTTP 300) لأن جدول `stock_movements` يحتوي على مفتاحين أجنبيين يشيران لجدول `warehouses`:
- `warehouse_id` (المستودع الأساسي)
- `from_warehouse_id` (مستودع المصدر للتحويلات)

PostgREST لا يستطيع تحديد أي علاقة يستخدم عند كتابة `warehouses(...)` بدون تحديد.

### الحل
تعديل الاستعلام في `ProductCard.tsx` لتحديد العلاقة بشكل صريح:

**ملف `src/pages/client/inventory/ProductCard.tsx` - سطر 54:**

تغيير:
```
warehouses(name, name_en, branch_id)
```
إلى:
```
warehouses!stock_movements_warehouse_id_fkey(name, name_en, branch_id)
```

هذا التغيير البسيط سيحل المشكلة بالكامل ويظهر جميع الحركات.

