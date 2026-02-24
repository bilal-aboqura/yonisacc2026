import { forwardRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Building2, Loader2 } from "lucide-react";

interface TreasuryAccount {
  id: string;
  name: string;
  name_en: string | null;
  balance: number;
}

interface TreasuryTransaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  type: string;
  amount: number;
  description: string | null;
}

const ClientTreasury = forwardRef<HTMLDivElement>((_, ref) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: company } = useQuery({
    queryKey: ["treasury-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["treasury-overview", company?.id],
    queryFn: async () => {
      if (!company?.id) return { accounts: [], transactions: [] };

      const [accountsRes, transactionsRes, balancesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, name_en")
          .eq("company_id", company.id)
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .in("type", ["asset"])
          .order("code"),
        supabase
          .from("treasury_transactions")
          .select("id, transaction_number, transaction_date, type, amount, description")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(8),
        (supabase.rpc as any)("get_account_balances", {
          p_company_id: company.id,
        }),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (balancesRes.error) throw balancesRes.error;

      const balanceMap = new Map<string, number>();
      if (balancesRes.data && typeof balancesRes.data === "object") {
        Object.entries(balancesRes.data).forEach(([accountId, balance]) => {
          balanceMap.set(accountId, Number(balance) || 0);
        });
      }

      return {
        accounts: (accountsRes.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          name_en: a.name_en,
          balance: balanceMap.get(a.id) || 0,
        })) as TreasuryAccount[],
        transactions: (transactionsRes.data || []).map((tx: any) => ({
          id: tx.id,
          transaction_number: tx.transaction_number,
          transaction_date: tx.transaction_date,
          type: tx.type,
          amount: Number(tx.amount) || 0,
          description: tx.description,
        })) as TreasuryTransaction[],
      };
    },
    enabled: !!company?.id,
    staleTime: 60 * 1000,
  });

  const accounts = data?.accounts || [];
  const recentTransactions = data?.transactions || [];

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div ref={ref} className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
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

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-xl">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground">{isRTL ? "إجمالي الرصيد" : "Total Balance"}</p>
              <p className="text-3xl font-bold">{totalBalance.toLocaleString()} {t("common.currency")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">
                  {isRTL ? account.name : (account.name_en || account.name)}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{account.balance.toLocaleString()} {t("common.currency")}</p>
            </CardContent>
          </Card>
        ))}

        {accounts.length === 0 && (
          <Card className="border-dashed flex items-center justify-center min-h-[180px]">
            <div className="text-center text-muted-foreground">
              {isRTL ? "لا توجد حسابات خزينة/بنوك بعد" : "No treasury/bank accounts yet"}
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "آخر العمليات" : "Recent Transactions"}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "لا توجد عمليات بعد" : "No transactions yet"}
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="font-medium">{tx.transaction_number}</p>
                    <p className="text-sm text-muted-foreground">{tx.description || (isRTL ? "بدون بيان" : "No description")}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-semibold">{tx.amount.toLocaleString()} {t("common.currency")}</p>
                    <p className="text-xs text-muted-foreground">{tx.transaction_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

ClientTreasury.displayName = "ClientTreasury";

export default ClientTreasury;
