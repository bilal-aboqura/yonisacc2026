import ModuleAccountSetup from "@/components/client/ModuleAccountSetup";
import type { SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات الإيرادات",
    titleEn: "Revenue Accounts",
    fields: [
      { key: "fuel_sales_revenue_account_id", labelAr: "إيراد مبيعات الوقود", labelEn: "Fuel Sales Revenue" },
      { key: "fuel_sales_tax_account_id", labelAr: "ضريبة مبيعات الوقود", labelEn: "Fuel Sales Tax" },
    ],
  },
  {
    titleAr: "حسابات المخزون",
    titleEn: "Inventory Accounts",
    fields: [
      { key: "fuel_inventory_account_id", labelAr: "مخزون الوقود", labelEn: "Fuel Inventory" },
      { key: "fuel_cogs_account_id", labelAr: "تكلفة الوقود المباع", labelEn: "Fuel COGS" },
    ],
  },
  {
    titleAr: "حسابات العملاء",
    titleEn: "Customer Accounts",
    fields: [
      { key: "fuel_customer_receivable_account_id", labelAr: "ذمم عملاء الوقود", labelEn: "Fuel Customer Receivable" },
      { key: "fuel_wallet_liability_account_id", labelAr: "التزام محافظ الوقود", labelEn: "Fuel Wallet Liability" },
    ],
  },
  {
    titleAr: "حسابات الموردين",
    titleEn: "Supplier Accounts",
    fields: [
      { key: "fuel_supplier_payable_account_id", labelAr: "ذمم موردي الوقود", labelEn: "Fuel Supplier Payable" },
    ],
  },
  {
    titleAr: "حسابات الخزينة",
    titleEn: "Treasury Accounts",
    fields: [
      { key: "fuel_cash_account_id", labelAr: "حساب الصندوق", labelEn: "Cash Account" },
      { key: "fuel_bank_account_id", labelAr: "حساب البنك", labelEn: "Bank Account" },
    ],
  },
];

const FuelAccountSetup = () => (
  <ModuleAccountSetup
    tableName="fuel_station_account_settings"
    titleAr="تجهيز حسابات محطة الوقود"
    titleEn="Fuel Station Account Setup"
    descriptionAr="ربط حسابات محطة الوقود بالدليل المحاسبي"
    descriptionEn="Link fuel station accounts to the chart of accounts"
    sections={sections}
  />
);

export default FuelAccountSetup;
