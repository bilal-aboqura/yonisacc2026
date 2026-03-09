

## خطة التعديلات

### 1. حذف تجهيز الحسابات من المبيعات والمشتريات
- **`src/components/client/ClientLayout.tsx`**: حذف سطري القائمة الجانبية لـ "تجهيز الحسابات" (سطر 123 و 135)
- **`src/App.tsx`**: حذف مسارات `/client/sales/setup` و `/client/purchases/setup` (سطر 266 و 278)

### 2. إصلاح رصيد العملاء والموردين
**المشكلة**: `get_account_balances` يرجع **كائن JSON** (`{account_id: balance}`) وليس مصفوفة. الكود الحالي في العملاء يعامله كمصفوفة بـ `.forEach` فيفشل. الموردين لا يستدعي الـ RPC أصلاً.

- **`src/pages/client/Customers.tsx`**: تصحيح تحويل البيانات من كائن لخريطة:
  ```tsx
  const balanceMap: Record<string, number> = {};
  if (balancesRes.data && typeof balancesRes.data === 'object') {
    Object.entries(balancesRes.data).forEach(([accountId, balance]) => {
      balanceMap[accountId] = Number(balance) || 0;
    });
  }
  ```

- **`src/pages/client/Vendors.tsx`**: إضافة استدعاء `get_account_balances` بنفس النمط وعرض `dynamic_balance` بدلاً من `balance`

### 3. إضافة كشف حساب لإجراءات العملاء والموردين
- في كلا الملفين، إضافة إجراء جديد "كشف حساب" في مصفوفة `actions` يوجه لصفحة دفتر الأستاذ مع فلتر حساب جهة الاتصال:
  ```tsx
  {
    label: isRTL ? "كشف حساب" : "Statement",
    icon: <FileText className="h-4 w-4" />,
    onClick: (row) => navigate(`/client/general-ledger?account=${row.account_id}`),
  }
  ```

### 4. تحويل أزرار الإجراءات لأيقونات
- تعديل `actions` في كلا الملفين لاستخدام خاصية `iconOnly: true` (إذا مدعومة في DataTable) أو استبدال عمود الإجراءات بأيقونات مباشرة مع Tooltips بدلاً من قائمة dropdown.
- سأتحقق من دعم DataTable للأيقونات المباشرة وإلا سأضيف عمود render مخصص بأيقونات.

### الملفات المتأثرة
- `src/components/client/ClientLayout.tsx`
- `src/App.tsx`
- `src/pages/client/Customers.tsx`
- `src/pages/client/Vendors.tsx`

