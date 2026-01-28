import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Building2 } from "lucide-react";

const ClientTreasury = forwardRef<HTMLDivElement>((_, ref) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const accounts = [
    {
      id: "1",
      name: isRTL ? "الصندوق الرئيسي" : "Main Cash",
      type: "cash",
      balance: 0,
      icon: Wallet,
    },
    {
      id: "2",
      name: isRTL ? "البنك الأهلي" : "National Bank",
      type: "bank",
      balance: 0,
      icon: Building2,
    },
  ];

  return (
    <div ref={ref} className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "الخزينة" : "Treasury"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة النقدية والحسابات البنكية" : "Manage cash and bank accounts"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/client/treasury/new?type=receipt")}>
            <ArrowUpRight className="h-4 w-4" />
            {isRTL ? "سند قبض" : "Receipt"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/client/treasury/new?type=payment")}>
            <ArrowDownRight className="h-4 w-4" />
            {isRTL ? "سند صرف" : "Payment"}
          </Button>
          <Button className="gap-2" onClick={() => navigate("/client/treasury/new?type=deposit")}>
            <Plus className="h-4 w-4" />
            {isRTL ? "إيداع / سحب" : "Deposit / Withdraw"}
          </Button>
        </div>
      </div>

      {/* Total Balance */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-xl">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground">{isRTL ? "إجمالي الرصيد" : "Total Balance"}</p>
              <p className="text-3xl font-bold">0 {t("common.currency")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <account.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{account.balance.toLocaleString()} {t("common.currency")}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  {isRTL ? "إيداع" : "Deposit"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1">
                  <ArrowDownRight className="h-3 w-3" />
                  {isRTL ? "سحب" : "Withdraw"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Account Card */}
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-[180px]">
          <div className="text-center">
            <div className="p-3 bg-muted rounded-full inline-block mb-2">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{isRTL ? "إضافة حساب جديد" : "Add New Account"}</p>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "آخر العمليات" : "Recent Transactions"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? "لا توجد عمليات بعد" : "No transactions yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ClientTreasury.displayName = "ClientTreasury";

export default ClientTreasury;
