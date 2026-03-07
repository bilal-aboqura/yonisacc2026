import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات المخزون والمبيعات",
    titleEn: "Inventory & Sales",
    fields: [
      { key: "gold_inventory_account_id", labelAr: "حساب مخزون الذهب", labelEn: "Gold Inventory Account" },
      { key: "gold_sales_revenue_account_id", labelAr: "حساب إيراد مبيعات الذهب", labelEn: "Gold Sales Revenue" },
      { key: "gold_cogs_account_id", labelAr: "حساب تكلفة مبيعات الذهب", labelEn: "Gold COGS Account" },
    ],
  },
  {
    titleAr: "حسابات المشتريات",
    titleEn: "Purchase Accounts",
    fields: [
      { key: "gold_purchase_expense_account_id", labelAr: "حساب مصروف مشتريات الذهب", labelEn: "Gold Purchase Expense" },
    ],
  },
  {
    titleAr: "الضرائب",
    titleEn: "Tax Accounts",
    fields: [
      { key: "gold_sales_tax_account_id", labelAr: "حساب ضريبة مبيعات الذهب", labelEn: "Gold Sales Tax" },
      { key: "gold_purchase_tax_account_id", labelAr: "حساب ضريبة مشتريات الذهب", labelEn: "Gold Purchase Tax" },
    ],
  },
  {
    titleAr: "تكاليف التصنيع",
    titleEn: "Manufacturing Costs",
    fields: [
      { key: "making_cost_revenue_account_id", labelAr: "حساب إيراد المصنعية", labelEn: "Making Cost Revenue" },
      { key: "stone_cost_account_id", labelAr: "حساب تكلفة الأحجار", labelEn: "Stone Cost Account" },
    ],
  },
  {
    titleAr: "الذمم المدينة والدائنة",
    titleEn: "Receivables & Payables",
    fields: [
      { key: "gold_receivable_account_id", labelAr: "حساب ذمم عملاء الذهب", labelEn: "Gold Receivable Account" },
      { key: "gold_payable_account_id", labelAr: "حساب ذمم موردي الذهب", labelEn: "Gold Payable Account" },
    ],
  },
];

const GoldAccountSetup = () => (
  <ModuleAccountSetup
    tableName="gold_account_settings"
    titleAr="تجهيز حسابات الذهب"
    titleEn="Gold Account Setup"
    descriptionAr="ربط عمليات الذهب والمجوهرات بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
    descriptionEn="Link gold & jewelry operations to Chart of Accounts for automatic journal entries"
    sections={sections}
  />
);

export default GoldAccountSetup;
