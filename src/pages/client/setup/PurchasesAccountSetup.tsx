import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات المشتريات",
    titleEn: "Purchase Accounts",
    fields: [
      { key: "purchase_expense_account_id", labelAr: "حساب مصروف المشتريات", labelEn: "Purchase Expense Account" },
      { key: "purchase_discount_account_id", labelAr: "حساب خصم المشتريات", labelEn: "Purchase Discount Account" },
    ],
  },
  {
    titleAr: "الضرائب والذمم الدائنة",
    titleEn: "Tax & Payables",
    fields: [
      { key: "purchase_tax_account_id", labelAr: "حساب ضريبة المشتريات", labelEn: "Purchase Tax Account" },
      { key: "purchase_payable_account_id", labelAr: "حساب ذمم الموردين", labelEn: "Accounts Payable" },
    ],
  },
];

const PurchasesAccountSetup = () => (
  <ModuleAccountSetup
    tableName="branch_account_settings"
    titleAr="تجهيز حسابات المشتريات"
    titleEn="Purchases Account Setup"
    descriptionAr="ربط عمليات المشتريات بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
    descriptionEn="Link purchase operations to Chart of Accounts for automatic journal entries"
    sections={sections}
  />
);

export default PurchasesAccountSetup;
