

## المشكلة

`.print-overlay-root` ليست حفيدة مباشرة لـ `body` — هي مدفونة عميقاً داخل شجرة React (داخل `#root > App > Router > ClientLayout > ...`). لذلك القاعدة:
```css
body > * > *:not(.print-overlay-root) { display: none !important; }
```
تُخفي الحاويات الأب التي بداخلها `.print-overlay-root` فتختفي معها.

## الحل

تغيير استراتيجية CSS بالكامل — بدلاً من محاولة استثناء `.print-overlay-root` عبر المستوى، نستخدم `visibility: hidden` على `body` ثم `visibility: visible` على `.print-overlay-root`:

**`src/index.css`** — تعديل قسم `@media print`:
```css
@media print {
  /* Hide everything */
  body * {
    visibility: hidden;
  }
  /* Show only print overlay and its contents */
  .print-overlay-root,
  .print-overlay-root * {
    visibility: visible !important;
  }
  .print-overlay-root {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    background: white !important;
    overflow: visible !important;
  }
  /* Hide toolbar */
  .print-overlay-root > .print\:hidden,
  .print-overlay-root .print\:hidden {
    display: none !important;
  }
  /* ... باقي القواعد تبقى كما هي */
}
```

هذا النمط (`visibility: hidden` + `visibility: visible`) هو الحل المعتمد لأنه:
- `visibility: hidden` يُخفي العنصر لكن **يحتفظ بمساحته** في DOM
- لكن الأهم: لا يُخفي الأبناء الذين لديهم `visibility: visible` — عكس `display: none`

### الملف المتأثر
- `src/index.css` فقط

