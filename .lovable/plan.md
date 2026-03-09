

## خطة تحسين طباعة التقارير

### المشكلة
1. **قائمة الدخل وكشف الحساب**: المحتوى يظهر مرتين عند الطباعة لأن CSS الطباعة يُخفي كل شيء ثم يُظهر `.print-layout`، لكن العناصر خلف PrintDialog لا تحتوي على `print:hidden` وبعض المتصفحات لا تطبق `visibility: hidden` بشكل موحد على كل الأبناء
2. **ميزان المراجعة**: الجدول يحتوي 9 أعمدة مما يسبب تداخل عند القيم الكبيرة

### الحل

#### 1. إصلاح CSS الطباعة (`src/index.css`)
- تغيير استراتيجية الإخفاء من `visibility: hidden` إلى `display: none` للتأكد من عدم ظهور أي محتوى مكرر
- إضافة قاعدة تخفي كل محتوى الصفحة ما عدا `.print-wrapper` الذي يحتوي `.print-layout`
- إضافة `table-layout: fixed` لجداول الطباعة لضمان توزيع الأعمدة بالتساوي

#### 2. إضافة `print:hidden` للصفحات (`IncomeStatement.tsx`, `GeneralLedger.tsx`, `TrialBalance.tsx`)
- لف المحتوى الرئيسي لكل صفحة بـ `print:hidden` لضمان إخفائه عند الطباعة وعرض PrintDialog فقط

#### 3. تحسين جدول ميزان المراجعة في الطباعة (`PrintLayout.tsx`)
- إضافة `table-layout: fixed` لجداول الطباعة
- تصغير حجم الخط تلقائياً عند زيادة عدد الأعمدة عن 6
- إضافة `word-break: break-word` للخلايا

### الملفات المتأثرة
- `src/index.css` — تحسين قواعد `@media print`
- `src/components/print/PrintDialog.tsx` — ضمان إخفاء الخلفية
- `src/components/print/PrintLayout.tsx` — تحسين الجدول للأعمدة الكثيرة

