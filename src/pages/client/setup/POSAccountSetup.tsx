import ModuleAccountSetup, { type SettingSection } from "@/components/client/ModuleAccountSetup";

const sections: SettingSection[] = [
  {
    titleAr: "حسابات الإيرادات",
    titleEn: "Revenue Accounts",
    fields: [
      { key: "sales_revenue_account_id", labelAr: "حساب إيراد مبيعات POS", labelEn: "POS Sales Revenue" },
      { key: "sales_tax_account_id", labelAr: "حساب ضريبة POS", labelEn: "POS Sales Tax" },
      { key: "tips_revenue_account_id", labelAr: "حساب إيراد البقشيش", labelEn: "Tips Revenue Account" },
    ],
  },
  {
    titleAr: "حسابات طرق الدفع",
    titleEn: "Payment Method Accounts",
    fields: [
      { key: "cash_account_id", labelAr: "حساب الصندوق (نقد)", labelEn: "Cash Account" },
      { key: "card_account_id", labelAr: "حساب البطاقة الائتمانية", labelEn: "Card Account" },
      { key: "bank_transfer_account_id", labelAr: "حساب التحويل البنكي", labelEn: "Bank Transfer Account" },
    ],
  },
  {
    titleAr: "الخصومات والمرتجعات",
    titleEn: "Discounts & Refunds",
    fields: [
      { key: "discount_account_id", labelAr: "حساب الخصومات", labelEn: "Discount Account" },
      { key: "coupon_expense_account_id", labelAr: "حساب مصروف الكوبونات", labelEn: "Coupon Expense Account" },
      { key: "refund_account_id", labelAr: "حساب المرتجعات", labelEn: "Refund Account" },
    ],
  },
  {
    titleAr: "المخزون وتكلفة البضاعة",
    titleEn: "Inventory & COGS",
    fields: [
      { key: "inventory_account_id", labelAr: "حساب المخزون", labelEn: "Inventory Account" },
      { key: "cogs_account_id", labelAr: "حساب تكلفة البضاعة المباعة", labelEn: "COGS Account" },
    ],
  },
];

const POSAccountSetup = () => (
  <ModuleAccountSetup
    tableName="pos_account_settings"
    titleAr="تجهيز حسابات نقاط البيع"
    titleEn="POS Account Setup"
    descriptionAr="ربط عمليات نقاط البيع بحسابات دليل الحسابات لإنشاء القيود المحاسبية آلياً"
    descriptionEn="Link POS operations to Chart of Accounts for automatic journal entries"
    sections={sections}
  />
);

export default POSAccountSetup;
