import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ArrowLeft, ArrowRight, CalendarIcon, Loader2, Wallet, History } from "lucide-react";

const RechargeWallet = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { id: walletId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [rechargeDate, setRechargeDate] = useState<Date>(new Date());

  const { data: wallet } = useQuery({
    queryKey: ["fuel-wallet", walletId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fuel_wallets")
        .select("*, fuel_customers(name, account_id)")
        .eq("id", walletId)
        .single();
      return data;
    },
    enabled: !!walletId,
  });

  // Recharge history
  const { data: transactions = [] } = useQuery({
    queryKey: ["fuel-wallet-transactions", walletId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fuel_wallet_transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .eq("type", "recharge")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!walletId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error(isRTL ? "أدخل مبلغ صحيح" : "Enter valid amount");

      const txDate = format(rechargeDate, "yyyy-MM-dd");

      // Get account settings for journal entry
      const { data: settings } = await (supabase as any)
        .from("fuel_station_account_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      // Use customer's linked account if available, otherwise fall back to global wallet liability
      const customerAccountId = wallet?.fuel_customers?.account_id;
      const creditAccount = customerAccountId || settings?.fuel_wallet_liability_account_id;
      const debitAccount = settings?.fuel_cash_account_id;

      let journalEntryId = null;
      if (debitAccount && creditAccount) {
        const entryNumber = `FW-${Date.now()}`;
        const { data: je, error: jeError } = await (supabase as any)
          .from("journal_entries")
          .insert({
            company_id: companyId!,
            entry_number: entryNumber,
            entry_date: txDate,
            description: `${isRTL ? "شحن محفظة وقود - " : "Fuel wallet recharge - "}${wallet?.fuel_customers?.name}`,
            status: "posted",
            is_auto: true,
          })
          .select("id")
          .single();
        if (jeError) throw jeError;
        journalEntryId = je.id;

        await (supabase as any).from("journal_entry_lines").insert([
          { entry_id: je.id, account_id: debitAccount, debit: amt, credit: 0 },
          { entry_id: je.id, account_id: creditAccount, debit: 0, credit: amt },
        ]);
      }

      // Update wallet balance
      const newBalance = Number(wallet.balance) + amt;
      await (supabase as any)
        .from("fuel_wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", walletId);

      // Record transaction with date
      await (supabase as any).from("fuel_wallet_transactions").insert({
        company_id: companyId,
        wallet_id: walletId,
        type: "recharge",
        amount: amt,
        balance_after: newBalance,
        journal_entry_id: journalEntryId,
        notes,
        transaction_date: txDate,
      });

      // Log message
      await (supabase as any).from("fuel_message_logs").insert({
        company_id: companyId,
        customer_id: wallet.customer_id,
        event_type: "wallet_recharge",
        message_text: `${isRTL ? "تم شحن محفظة الوقود بمبلغ" : "Fuel wallet recharged with"} ${amt} SAR. ${isRTL ? "الرصيد الحالي:" : "Current balance:"} ${newBalance} SAR.`,
        status: "logged",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-wallet-transactions"] });
      toast({ title: isRTL ? "تم شحن المحفظة" : "Wallet Recharged" });
      setAmount("");
      setNotes("");
      setRechargeDate(new Date());
    },
    onError: (e: any) =>
      toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/fuel/wallets")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          {isRTL ? "شحن المحفظة" : "Recharge Wallet"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{wallet?.fuel_customers?.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "الرصيد الحالي:" : "Current balance:"}{" "}
            {Number(wallet?.balance || 0).toLocaleString()} SAR
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "مبلغ الشحن (SAR) *" : "Recharge Amount (SAR) *"}</Label>
              <Input
                type="number"
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "تاريخ الشحن" : "Recharge Date"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !rechargeDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 me-2" />
                    {rechargeDate
                      ? format(rechargeDate, "dd/MM/yyyy", { locale: isRTL ? ar : enUS })
                      : isRTL
                      ? "اختر التاريخ"
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rechargeDate}
                    onSelect={(d) => d && setRechargeDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!amount || parseFloat(amount) <= 0 || mutation.isPending}
            className="w-full gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRTL ? "شحن المحفظة" : "Recharge Wallet"}
          </Button>
        </CardContent>
      </Card>

      {/* Recharge History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              {isRTL ? "سجل الشحن" : "Recharge History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-emerald-600">
                      +{Number(tx.amount).toLocaleString()} SAR
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.transaction_date
                        ? format(new Date(tx.transaction_date), "dd/MM/yyyy")
                        : format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                    {tx.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{tx.notes}</p>
                    )}
                  </div>
                  <div className="text-end">
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? "الرصيد بعد" : "Balance after"}
                    </p>
                    <p className="font-medium">{Number(tx.balance_after).toLocaleString()} SAR</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RechargeWallet;
