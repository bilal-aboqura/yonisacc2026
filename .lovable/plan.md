

# إصلاح طباعة صفحتين بدلاً من واحدة

## المشكلة
عند الطباعة، المحتوى الذي يُفترض أن يكون في صفحة واحدة يُطبع على صفحتين. السبب:
1. `PrintDialog` wrapper يحتوي على `minHeight: "297mm"` — وهذا يفرض ارتفاع صفحة كاملة حتى لو المحتوى أقل، ومع `@page margin: 10mm` (أعلى + أسفل = 20مم) يتجاوز المجموع ارتفاع الصفحة فيُنتج صفحة ثانية فارغة.
2. `padding: "12mm 15mm"` على الـ wrapper يضيف مسافات إضافية تتراكم مع هوامش `@page`.

## الحل

### 1. `src/components/print/PrintDialog.tsx`
- إزالة `minHeight: "297mm"` من wrapper — لا داعي لفرض ارتفاع ثابت
- إبقاء `width: "210mm"` للمعاينة فقط (CSS يتجاوزه عند الطباعة)

### 2. `src/index.css` — قسم `@media print`
- إضافة `min-height: auto !important` و `height: auto !important` على `.print-wrapper` لإلغاء أي ارتفاع ثابت
- تقليل `@page margin` من `10mm` إلى `8mm` لتوفير مساحة أكبر

| الملف | التعديل |
|-------|---------|
| `src/components/print/PrintDialog.tsx` | إزالة `minHeight: "297mm"` |
| `src/index.css` | إضافة `height: auto` وتقليل هوامش الصفحة |

