

## خطة بناء مديول إدارة محطات الوقود (Fuel Station Management)

### نطاق العمل

بناء مديول كامل لإدارة محطات الوقود يتضمن: العملاء والمحافظ، المضخات والخزانات، نقطة بيع الوقود، تسعير الوقود، التقارير، وتجهيز الحسابات — مع ربط كامل بالمحاسبة والمخزون.

### 1. قاعدة البيانات (Migration)

إنشاء الجداول التالية:

- **`fuel_station_account_settings`** — تجهيز حسابات المديول (نمط `ModuleAccountSetup`)
- **`fuel_customers`** — عملاء الوقود (name, mobile, type [individual/company/government], plate_number, credit_limit, balance, status, account_id, company_id)
- **`fuel_wallets`** — محافظ الوقود (customer_id, balance, company_id)
- **`fuel_wallet_transactions`** — حركات المحفظة (wallet_id, type [recharge/deduction/refund], amount, balance_after, reference_id, notes)
- **`fuel_pumps`** — المضخات (pump_number, fuel_type, tank_id, meter_reading, status, company_id)
- **`fuel_tanks`** — الخزانات (fuel_type, capacity, current_qty, min_alert_level, warehouse_id, company_id)
- **`fuel_tank_refills`** — تعبئة الخزانات (tank_id, quantity, supplier_id, unit_cost, total_cost, journal_entry_id)
- **`fuel_prices`** — جدول الأسعار (fuel_type, price_per_liter, effective_date, company_id)
- **`fuel_sales`** — مبيعات الوقود (customer_id, pump_id, fuel_type, quantity, unit_price, total_amount, payment_method [wallet/cash], journal_entry_id, company_id)
- **`fuel_message_logs`** — سجل الرسائل (customer_id, event_type, message_text, status, company_id)

مع RLS على جميع الجداول بـ `company_id`.

### 2. شاشة تجهيز الحسابات

ملف: `src/pages/client/fuel/FuelAccountSetup.tsx`

يستخدم `ModuleAccountSetup` مع الأقسام:
- **حسابات الإيرادات**: إيراد مبيعات الوقود، ضريبة مبيعات الوقود
- **حسابات المخزون**: مخزون الوقود، تكلفة الوقود المباع (COGS)
- **حسابات العملاء**: ذمم عملاء الوقود، التزام محافظ الوقود
- **حسابات الموردين**: ذمم موردي الوقود
- **حسابات الخزينة**: حساب الصندوق، حساب البنك

### 3. الشاشات الداخلية (غير منبثقة)

جميع الشاشات صفحات مستقلة (Route-based) كما في باقي المديولات:

| المسار | الشاشة |
|--------|--------|
| `/client/fuel` | لوحة تحكم المحطة (FuelDashboard) |
| `/client/fuel/customers` | قائمة عملاء الوقود |
| `/client/fuel/customers/new` | إضافة عميل وقود |
| `/client/fuel/customers/:id/edit` | تعديل عميل وقود |
| `/client/fuel/customers/:id/statement` | كشف حساب العميل |
| `/client/fuel/wallets` | إدارة المحافظ |
| `/client/fuel/wallets/:id/recharge` | شحن محفظة |
| `/client/fuel/pumps` | إدارة المضخات |
| `/client/fuel/pumps/new` | إضافة مضخة |
| `/client/fuel/tanks` | إدارة الخزانات |
| `/client/fuel/tanks/new` | إضافة خزان |
| `/client/fuel/tanks/:id/refill` | تعبئة خزان |
| `/client/fuel/pos` | نقطة بيع الوقود |
| `/client/fuel/prices` | إدارة الأسعار |
| `/client/fuel/reports` | التقارير |
| `/client/fuel/setup` | تجهيز الحسابات |

### 4. ربط القيود المحاسبية

كل عملية مالية تولد قيد يومية تلقائياً:

- **شحن محفظة**: مدين النقد/البنك ← دائن التزام المحفظة
- **بيع وقود (محفظة)**: مدين التزام المحفظة ← دائن إيراد مبيعات الوقود
- **بيع وقود (نقد)**: مدين النقد ← دائن إيراد مبيعات الوقود
- **تعبئة خزان**: مدين مخزون الوقود ← دائن ذمم الموردين

يتم جلب الحسابات من `fuel_station_account_settings` وإنشاء القيد عبر `supabase.from("journal_entries").insert(...)` مع سطوره.

### 5. تحديث الباقات وإدارة الشركات

إضافة `fuelstation` إلى `ALL_MODULES` في 4 ملفات:
- `src/pages/owner/OwnerPlans.tsx`
- `src/pages/owner/ManageCompanyAccess.tsx`
- `src/pages/owner/CreateSubscriber.tsx`
- `src/components/client/TeamManagement.tsx`

```typescript
{ key: "fuelstation", labelAr: "محطات الوقود", labelEn: "Fuel Station", icon: Fuel, color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/30" }
```

### 6. تحديث القائمة الجانبية (ClientLayout)

إضافة `fuelStationMenuGroup` بـ `moduleKey: "fuelstation"` مع جميع الشاشات.

### 7. تحديث App.tsx

إضافة جميع Routes تحت `{/* Fuel Station */}`.

### الملفات الجديدة (~18 ملف)

```
src/pages/client/fuel/FuelDashboard.tsx
src/pages/client/fuel/FuelCustomers.tsx
src/pages/client/fuel/CreateFuelCustomer.tsx
src/pages/client/fuel/FuelCustomerStatement.tsx
src/pages/client/fuel/FuelWallets.tsx
src/pages/client/fuel/RechargeWallet.tsx
src/pages/client/fuel/FuelPumps.tsx
src/pages/client/fuel/CreateFuelPump.tsx
src/pages/client/fuel/FuelTanks.tsx
src/pages/client/fuel/CreateFuelTank.tsx
src/pages/client/fuel/RefillTank.tsx
src/pages/client/fuel/FuelPOS.tsx
src/pages/client/fuel/FuelPrices.tsx
src/pages/client/fuel/FuelReports.tsx
src/pages/client/fuel/FuelAccountSetup.tsx
```

### الملفات المعدّلة (5 ملفات)

- `src/App.tsx` — إضافة routes
- `src/components/client/ClientLayout.tsx` — إضافة القائمة الجانبية
- `src/pages/owner/OwnerPlans.tsx` — إضافة للمديولات
- `src/pages/owner/ManageCompanyAccess.tsx` — إضافة للمديولات
- `src/pages/owner/CreateSubscriber.tsx` — إضافة للمديولات
- `src/components/client/TeamManagement.tsx` — إضافة للمديولات

### ملاحظة بخصوص الرسائل (SMS/WhatsApp)

سيتم بناء البنية التحتية لسجل الرسائل (`fuel_message_logs`) مع واجهة عرض السجل. الربط الفعلي مع مزودي الخدمة (Twilio/Unifonic/Taqnyat) يتطلب مفاتيح API وسيتم تنفيذه لاحقاً كمرحلة ثانية عبر Edge Function.

