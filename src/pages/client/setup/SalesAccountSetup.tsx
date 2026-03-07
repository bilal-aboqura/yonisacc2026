import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات الإيرادات",
    titleEn: "Revenue Accounts",
    fields: [
      { key: "sales_revenue_account_id", labelAr: "حساب إيراد المبيعات", labelEn: "Sales Revenue Account" },
      { key: "sales_discount_account_id", labelAr: "حساب خصم المبيعات", labelEn: "Sales Discount Account" },
    ],
  },
  {
    titleAr: "حسابات الضرائب والذمم",
    titleEn: "Tax & Receivables",
    fields: [
      { key: "sales_tax_account_id", labelAr: "حساب ضريبة المبيعات", labelEn: "Sales Tax Account" },
      { key: "sales_receivable_account_id", labelAr: "حساب ذمم العملاء", labelEn: "Accounts Receivable" },
    ],
  },
  {
    titleAr: "تكلفة البضاعة المباعة",
    titleEn: "Cost of Goods Sold",
    fields: [
      { key: "cogs_account_id", labelAr: "حساب تكلفة البضاعة المباعة", labelEn: "COGS Account" },
      { key: "inventory_account_id", labelAr: "حساب المخزون", labelEn: "Inventory Account" },
    ],
  },
];

const SalesAccountSetup = () => (
  <ModuleAccountSetup
    tableName="branch_account_settings"
    branchMode={{ moduleType: "sales" }}
    titleAr="تجهيز حسابات المبيعات"
    titleEn="Sales Account Setup"
    descriptionAr="ربط عمليات المبيعات بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
    descriptionEn="Link sales operations to Chart of Accounts for automatic journal entries"
    sections={sections}
  />
);

export default SalesAccountSetup;
