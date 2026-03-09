

## المشكلة

قاعدة CSS للطباعة تُخفي `#root` (الابن المباشر لـ `body`) بالكامل:
```css
body > *:not(.print-overlay-root) { display: none !important; }
```

لكن `.print-overlay-root` ليست ابناً مباشراً لـ `body` — هي داخل `#root`. لذلك يتم إخفاء كل شيء بما فيه نافذة الطباعة.

## الحل

تعديل `src/index.css` فقط — تغيير الاستراتيجية:

1. **عدم إخفاء `#root`** — بل إخفاء كل شيء داخله ما عدا `.print-overlay-root`
2. إخفاء الأشرطة الجانبية والعناصر الأخرى عبر استهداف أدق

```css
@media print {
  /* Hide app shell but keep print overlay visible */
  body > * > *:not(.print-overlay-root) {
    display: none !important;
  }
  .print-overlay-root {
    display: block !important;
    position: static !important;
    background: white !important;
    overflow: visible !important;
  }
}
```

### الملف المتأثر
- `src/index.css` — سطر 460 فقط

