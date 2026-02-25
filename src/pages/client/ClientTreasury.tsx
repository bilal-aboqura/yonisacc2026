import { forwardRef, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Building2, Loader2, BookOpen, Undo2, ArrowLeftRight, Eye, Pencil, Trash2, Copy, Printer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

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
  status: string | null;
  journal_entry_id: string | null;
}

const ClientTreasury = forwardRef<HTMLDivElement>((_, ref) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reverseTarget, setReverseTarget] = useState<TreasuryTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreasuryTransaction | null>(null);

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

      const { data: cashBankGlobals } = await supabase
        .from("global_accounts" as any)
        .select("id")
        .eq("is_active", true)
        .like("code", "111%")
        .eq("is_parent", false);

      const cashBankGlobalIds = (cashBankGlobals || []).map((g: any) => g.id);

      const [accountsRes, transactionsRes, balancesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, name_en")
          .eq("company_id", company.id)
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .in("global_account_id", cashBankGlobalIds.length > 0 ? cashBankGlobalIds : ["__none__"])
          .order("code"),
        supabase
          .from("treasury_transactions")
          .select("id, transaction_number, transaction_date, type, amount, description, status, journal_entry_id")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(10),
        (supabase.rpc as any)("get_account_balances", { p_company_id: company.id }),
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
          id: a.id, name: a.name, name_en: a.name_en,
          balance: balanceMap.get(a.id) || 0,
        })) as TreasuryAccount[],
        transactions: (transactionsRes.data || []).map((tx: any) => ({
          id: tx.id, transaction_number: tx.transaction_number,
          transaction_date: tx.transaction_date, type: tx.type,
          amount: Number(tx.amount) || 0, description: tx.description,
          status: tx.status, journal_entry_id: tx.journal_entry_id,
        })) as TreasuryTransaction[],
      };
    },
    enabled: !!company?.id,
    staleTime: 60 * 1000,
  });

  const reverseMutation = useMutation({
    mutationFn: async (txId: string) => {
      const { data, error } = await (supabase.rpc as any)("reverse_treasury_transaction", {
        p_company_id: company!.id,
        p_transaction_id: txId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: isRTL ? "تم العكس بنجاح" : "Reversed successfully",
        description: isRTL ? `تم إنشاء قيد عكسي ${data?.reverse_journal_number || ""}` : `Reversal entry ${data?.reverse_journal_number || ""} created`,
      });
      queryClient.invalidateQueries({ queryKey: ["treasury-overview"] });
      setReverseTarget(null);
    },
    onError: (error: any) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: error?.message || "Failed", variant: "destructive" });
    },
  });

  const accounts = data?.accounts || [];
  const recentTransactions = data?.transactions || [];

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      receipt: { ar: "قبض", en: "Receipt" },
      payment: { ar: "صرف", en: "Payment" },
      deposit: { ar: "إيداع", en: "Deposit" },
      withdrawal: { ar: "سحب", en: "Withdrawal" },
      transfer: { ar: "تحويل", en: "Transfer" },
    };
    return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    if (type === "receipt" || type === "deposit") return "default";
    if (type === "payment" || type === "withdrawal") return "destructive";
    return "secondary";
  };

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
            {isRTL ? "إدارة النقدية والحسابات البنكية - مرتبط بالقيود المحاسبية" : "Cash & bank management - linked to accounting"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/client/treasury/new?type=receipt")}>
            <ArrowUpRight className="h-4 w-4" />
            {isRTL ? "سند قبض" : "Receipt"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/client/treasury/new?type=payment")}>
            <ArrowDownRight className="h-4 w-4" />
            {isRTL ? "سند صرف" : "Payment"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/client/treasury/new?type=transfer")}>
            <ArrowLeftRight className="h-4 w-4" />
            {isRTL ? "تحويل" : "Transfer"}
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
            <TooltipProvider delayDuration={200}>
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className={`flex items-center justify-between p-3 rounded-lg bg-muted/40 ${tx.status === "reversed" ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tx.transaction_number}</p>
                          <Badge variant={getTypeBadgeVariant(tx.type)} className="text-xs">{getTypeLabel(tx.type)}</Badge>
                          {tx.status === "reversed" && (
                            <Badge variant="outline" className="text-xs">{isRTL ? "معكوس" : "Reversed"}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{tx.description || (isRTL ? "بدون بيان" : "No description")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <p className="font-semibold tabular-nums">{tx.amount.toLocaleString()} {t("common.currency")}</p>
                        <p className="text-xs text-muted-foreground">{tx.transaction_date}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {/* View */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/treasury/${tx.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{isRTL ? "معاينة" : "View"}</TooltipContent>
                        </Tooltip>
                        {/* Edit */}
                        {tx.status !== "reversed" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/treasury/${tx.id}/edit`)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Reverse */}
                        {tx.status !== "reversed" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReverseTarget(tx)}>
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isRTL ? "عكس العملية" : "Reverse"}</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Print */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigate(`/client/treasury/${tx.id}`); setTimeout(() => window.print(), 500); }}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{isRTL ? "طباعة" : "Print"}</TooltipContent>
                        </Tooltip>
                        {/* Copy */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/treasury/new?type=${tx.type}`)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{isRTL ? "نسخ كعملية جديدة" : "Copy as new"}</TooltipContent>
                        </Tooltip>
                        {/* Permanent Delete */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(tx)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{isRTL ? "حذف نهائي" : "Delete"}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Reverse Confirmation Dialog */}
      <AlertDialog open={!!reverseTarget} onOpenChange={(open) => !open && setReverseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "عكس العملية" : "Reverse Transaction"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من عكس العملية ${reverseTarget?.transaction_number}؟ سيتم إنشاء قيد عكسي تلقائياً.`
                : `Are you sure you want to reverse ${reverseTarget?.transaction_number}? A reversing journal entry will be created automatically.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => reverseTarget && reverseMutation.mutate(reverseTarget.id)}
            >
              {reverseMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              {isRTL ? "عكس" : "Reverse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Permanent Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "حذف نهائي" : "Permanent Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف العملية ${deleteTarget?.transaction_number} نهائياً؟ سيتم حذف القيد المحاسبي المرتبط. هذا الإجراء لا يمكن التراجع عنه.`
                : `Permanently delete ${deleteTarget?.transaction_number}? The linked journal entry will also be deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  if (deleteTarget.journal_entry_id) {
                    await supabase.from("journal_entry_lines").delete().eq("entry_id", deleteTarget.journal_entry_id);
                    await supabase.from("journal_entries").delete().eq("id", deleteTarget.journal_entry_id);
                  }
                  await supabase.from("treasury_transactions").delete().eq("id", deleteTarget.id);
                  toast({ title: isRTL ? "تم الحذف النهائي" : "Permanently deleted" });
                  queryClient.invalidateQueries({ queryKey: ["treasury-overview"] });
                } catch (e: any) {
                  toast({ title: isRTL ? "خطأ" : "Error", description: e?.message, variant: "destructive" });
                }
                setDeleteTarget(null);
              }}
            >
              {isRTL ? "حذف نهائي" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ClientTreasury.displayName = "ClientTreasury";

export default ClientTreasury;
