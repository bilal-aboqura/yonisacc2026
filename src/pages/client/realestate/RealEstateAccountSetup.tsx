import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات الإيرادات",
    titleEn: "Revenue Accounts",
    fields: [
      { key: "rental_revenue_account_id", labelAr: "حساب إيرادات الإيجار", labelEn: "Rental Revenue Account" },
      { key: "tenant_receivable_account_id", labelAr: "حساب ذمم المستأجرين", labelEn: "Tenant Receivable Account" },
    ],
  },
  {
    titleAr: "حسابات المصروفات",
    titleEn: "Expense Accounts",
    fields: [
      { key: "maintenance_expense_account_id", labelAr: "حساب مصروفات الصيانة", labelEn: "Maintenance Expense Account" },
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
    titleAr: "حسابات أخرى",
    titleEn: "Other Accounts",
    fields: [
      { key: "security_deposit_liability_account_id", labelAr: "حساب التزام التأمين", labelEn: "Security Deposit Liability Account" },
    ],
  },
];

const RealEstateAccountSetup = () => (
  <ModuleAccountSetup
    tableName="re_account_settings"
    titleAr="تجهيز حسابات العقارات"
    titleEn="Real Estate Account Setup"
    descriptionAr="ربط الحسابات المحاسبية بعمليات إدارة العقارات"
    descriptionEn="Map accounting accounts to real estate operations"
    sections={sections}
  />
);

export default RealEstateAccountSetup;
