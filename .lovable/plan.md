

# إصلاح عرض الطباعة — الجداول لا تملأ عرض الصفحة

## المشكلة
عند الطباعة، المحتوى (الجدول والبيانات) لا يملأ عرض الصفحة بالكامل ويظهر مضغوطاً. السبب تراكم هوامش متعددة:
- `@page margin: 12mm 10mm` (هوامش الصفحة)
- `PrintDialog` wrapper بـ `padding: 12mm 15mm` 
- `PrintLayout` بـ `maxWidth: 210mm` + padding من الإعدادات
- CSS `.print-layout` يحاول `padding: 0` لكن inline styles تتغلب عليه

## الحل

### 1. تعديل `src/index.css` — قسم `@media print`
- إضافة `!important` على `.print-layout` لإلغاء الـ inline padding/maxWidth
- جعل `.print-layout` يأخذ `width: 100% !important` بدلاً من `210mm`
- إزالة الـ padding الإضافي من wrapper في وضع الطباعة
- إضافة حدود واضحة للجداول في الطباعة

```css
.print-layout {
  position: absolute;
  left: 0;
  top: 0;
  width: 100% !important;
  max-width: none !important;
  min-height: auto;
  margin: 0 !important;
  padding: 0 !important;
  background: white !important;
}

/* Force table full width with visible borders */
.print-layout table {
  width: 100% !important;
  border-collapse: collapse !important;
}
.print-layout table th,
.print-layout table td {
  border: 1px solid #374151 !important;
}
```

### 2. تعديل `src/components/print/PrintDialog.tsx`
- إزالة `width: "210mm"` و `padding: "12mm 15mm"` من wrapper في وضع الطباعة عبر إضافة class `print:!w-full print:!p-0 print:!min-h-0`

### 3. تعديل `src/components/print/PrintLayout.tsx`
- إزالة `maxWidth: "210mm"` واستبداله بـ `width: "100%"`
- ضمان الجداول تأخذ عرض كامل

### 4. تعديل `src/components/print/VoucherLayout.tsx`
- نفس التعديل: إزالة `maxWidth` واستبداله بـ `width: "100%"`

## الملفات المتأثرة
| الملف | التعديل |
|-------|---------|
| `src/index.css` | تحسين CSS الطباعة |
| `src/components/print/PrintDialog.tsx` | إزالة أبعاد ثابتة في الطباعة |
| `src/components/print/PrintLayout.tsx` | `width: 100%` بدل `maxWidth` |
| `src/components/print/VoucherLayout.tsx` | `width: 100%` بدل `maxWidth` |

