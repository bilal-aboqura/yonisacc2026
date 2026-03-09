
## إخفاء رمز QR من فواتير المشتريات

### المشكلة
رمز QR الخاص بهيئة الزكاة يظهر في فواتير المشتريات رغم أنه مطلوب فقط في فواتير المبيعات حسب متطلبات الهيئة. المورد هو من يضع الباركود على فاتورته وليس المشتري.

### الحل
تعديل بسيط في ملف `src/pages/client/ViewInvoice.tsx` سطر 90:

تغيير `showQR: true` إلى `showQR: false` في إعدادات نوع `purchase`.

```tsx
// Before
purchase: { ..., showQR: true, isQuote: false }

// After  
purchase: { ..., showQR: false, isQuote: false }
```

تغيير سطر واحد فقط.
