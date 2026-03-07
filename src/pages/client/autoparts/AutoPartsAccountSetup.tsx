import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات المبيعات",
    titleEn: "Sales Accounts",
    fields: [
      { key: "sales_revenue_account_id", labelAr: "حساب إيرادات مبيعات القطع", labelEn: "Parts Sales Revenue Account" },
      { key: "sales_receivable_account_id", labelAr: "حساب ذمم العملاء", labelEn: "Customer Receivable Account" },
      { key: "sales_discount_account_id", labelAr: "حساب خصم المبيعات", labelEn: "Sales Discount Account" },
      { key: "sales_tax_account_id", labelAr: "حساب ضريبة المبيعات", labelEn: "Sales Tax Account" },
    ],
  },
  {
    titleAr: "حسابات المشتريات",
    titleEn: "Purchase Accounts",
    fields: [
      { key: "purchase_expense_account_id", labelAr: "حساب مشتريات القطع", labelEn: "Parts Purchase Account" },
      { key: "purchase_payable_account_id", labelAr: "حساب ذمم الموردين", labelEn: "Supplier Payable Account" },
      { key: "purchase_discount_account_id", labelAr: "حساب خصم المشتريات", labelEn: "Purchase Discount Account" },
      { key: "purchase_tax_account_id", labelAr: "حساب ضريبة المشتريات", labelEn: "Purchase Tax Account" },
    ],
  },
  {
    titleAr: "حسابات المخزون",
    titleEn: "Inventory Accounts",
    fields: [
      { key: "inventory_account_id", labelAr: "حساب المخزون", labelEn: "Inventory Account" },
      { key: "cogs_account_id", labelAr: "حساب تكلفة البضاعة المباعة", labelEn: "Cost of Goods Sold Account" },
    ],
  },
  {
    titleAr: "حسابات المرتجعات والنقدية",
    titleEn: "Returns & Cash Accounts",
    fields: [
      { key: "inventory_loss_account_id", labelAr: "حساب مرتجعات المبيعات", labelEn: "Sales Return Account" },
      { key: "inventory_gain_account_id", labelAr: "حساب النقدية / البنك", labelEn: "Cash / Bank Account" },
    ],
  },
];

const AutoPartsAccountSetup = () => (
  <ModuleAccountSetup
    tableName="branch_account_settings"
    branchMode={{ moduleType: "auto_parts" }}
    titleAr="تجهيز حسابات قطع الغيار"
    titleEn="Auto Spare Parts Accounting Setup"
    descriptionAr="ربط عمليات قطع الغيار بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
    descriptionEn="Map auto parts operations to Chart of Accounts for automatic journal entries"
    sections={sections}
  />
);

export default AutoPartsAccountSetup;
