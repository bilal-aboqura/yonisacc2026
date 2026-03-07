import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات الإيرادات",
    titleEn: "Revenue Accounts",
    fields: [
      { key: "sales_revenue_account_id", labelAr: "حساب إيرادات المبيعات", labelEn: "Sales Revenue Account" },
      { key: "delivery_revenue_account_id", labelAr: "حساب إيرادات التوصيل", labelEn: "Delivery Revenue Account" },
    ],
  },
  {
    titleAr: "حسابات النقدية",
    titleEn: "Cash Accounts",
    fields: [
      { key: "cash_account_id", labelAr: "حساب النقدية", labelEn: "Cash Account" },
      { key: "bank_account_id", labelAr: "حساب البنك", labelEn: "Bank Account" },
    ],
  },
  {
    titleAr: "حسابات العملاء",
    titleEn: "Customer Accounts",
    fields: [
      { key: "customer_receivable_account_id", labelAr: "حساب ذمم العملاء", labelEn: "Customer Receivable Account" },
      { key: "sales_return_account_id", labelAr: "حساب مرتجعات المبيعات", labelEn: "Sales Return Account" },
    ],
  },
  {
    titleAr: "حسابات السائقين",
    titleEn: "Driver Accounts",
    fields: [
      { key: "delivery_commission_expense_account_id", labelAr: "حساب مصروف عمولة التوصيل", labelEn: "Delivery Commission Expense Account" },
      { key: "driver_payable_account_id", labelAr: "حساب مستحقات السائقين", labelEn: "Driver Payable Account" },
    ],
  },
];

const DeliveryAccountSetup = () => (
  <ModuleAccountSetup
    tableName="delivery_account_settings"
    titleAr="تجهيز حسابات التوصيل"
    titleEn="Delivery Module Accounting Setup"
    descriptionAr="ربط الحسابات المحاسبية بعمليات التوصيل"
    descriptionEn="Map accounting accounts to delivery operations"
    sections={sections}
  />
);

export default DeliveryAccountSetup;
