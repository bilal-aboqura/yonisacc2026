

## خطة: إضافة إعدادات تابي وتمارا في لوحة المالك

### الفكرة
إضافة قسم جديد في صفحة إعدادات المالك (`OwnerSettings.tsx`) لإدارة بوابات الدفع (تابي وتمارا) — يشمل تفعيل/تعطيل كل بوابة، اختيار البيئة (تجريبية/إنتاجية)، وحفظ مفاتيح API. تُخزن الإعدادات في جدول `owner_settings` الموجود.

### التعديلات

**1. تعديل `src/pages/owner/OwnerSettings.tsx`**

- إضافة interface جديد:
```typescript
interface PaymentGatewaySettings {
  tabby_enabled: boolean;
  tabby_environment: 'sandbox' | 'production';
  tabby_public_key: string;
  tabby_secret_key: string;
  tamara_enabled: boolean;
  tamara_environment: 'sandbox' | 'production';
  tamara_api_token: string;
  tamara_notification_token: string;
}
```

- إضافة state وlogic للتحميل والحفظ بنفس نمط الإعدادات الحالية (setting_key = `payment_gateways`)

- إضافة كارد جديد يحتوي على:
  - **تابي (Tabby)**: Switch للتفعيل، Select للبيئة، حقول Public Key و Secret Key
  - **تمارا (Tamara)**: Switch للتفعيل، Select للبيئة، حقول API Token و Notification Token
  - جميع حقول المفاتيح من نوع `password` لإخفاء القيم
  - زر حفظ مشترك

- إضافة أيقونة `CreditCard` من lucide-react

### ملاحظات تقنية
- لا حاجة لتعديل قاعدة البيانات — جدول `owner_settings` يدعم تخزين JSON مرن
- المفاتيح تُخزن في `setting_value` كـ JSON object
- يمكن لاحقاً قراءة هذه الإعدادات من Edge Functions لإنشاء جلسات الدفع

