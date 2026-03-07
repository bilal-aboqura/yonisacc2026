import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات المخزون",
    titleEn: "Inventory Accounts",
    fields: [
      { key: "inventory_account_id", labelAr: "حساب المخزون", labelEn: "Inventory Account" },
      { key: "cogs_account_id", labelAr: "حساب تكلفة البضاعة المباعة", labelEn: "COGS Account" },
    ],
  },
  {
    titleAr: "أرباح وخسائر المخزون",
    titleEn: "Inventory Gains & Losses",
    fields: [
      { key: "inventory_gain_account_id", labelAr: "حساب أرباح المخزون (تسويات)", labelEn: "Inventory Gain Account" },
      { key: "inventory_loss_account_id", labelAr: "حساب خسائر المخزون (تسويات)", labelEn: "Inventory Loss Account" },
    ],
  },
  {
    titleAr: "حسابات التشغيل",
    titleEn: "Operations Accounts",
    fields: [
      { key: "consumption_expense_account_id", labelAr: "حساب مصروف الاستهلاك الداخلي", labelEn: "Consumption Expense Account" },
      { key: "wip_account_id", labelAr: "حساب العمل تحت التشغيل (التصنيع)", labelEn: "Work in Progress (Manufacturing)" },
    ],
  },
];

const InventoryAccountSetup = () => (
  <ModuleAccountSetup
    tableName="branch_account_settings"
    branchMode={{ moduleType: "inventory" }}
    titleAr="تجهيز حسابات المخزون"
    titleEn="Inventory Account Setup"
    descriptionAr="ربط عمليات المخزون بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
    descriptionEn="Link inventory operations to Chart of Accounts for automatic journal entries"
    sections={sections}
  />
);

export default InventoryAccountSetup;
