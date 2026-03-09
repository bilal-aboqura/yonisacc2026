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
import { ArrowLeft, ArrowRight, Loader2, Wallet } from "lucide-react";

const RechargeWallet = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { id: walletId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: wallet } = useQuery({
    queryKey: ["fuel-wallet", walletId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_wallets").select("*, fuel_customers(name)").eq("id", walletId).single();
      return data;
    },
    enabled: !!walletId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error(isRTL ? "أدخل مبلغ صحيح" : "Enter valid amount");

      // Get account settings for journal entry
      const { data: settings } = await (supabase as any).from("fuel_station_account_settings").select("*").eq("company_id", companyId).maybeSingle();

      // Create journal entry if accounts are configured
      let journalEntryId = null;
      if (settings?.fuel_cash_account_id && settings?.fuel_wallet_liability_account_id) {
        const { data: je, error: jeError } = await supabase.from("journal_entries").insert({
          company_id: companyId!,
          date: new Date().toISOString().split("T")[0],
          description: `${isRTL ? "شحن محفظة وقود - " : "Fuel wallet recharge - "}${wallet?.fuel_customers?.name}`,
          is_posted: true,
          source: "fuel_wallet",
        }).select("id").single();
        if (jeError) throw jeError;
        journalEntryId = je.id;

        await supabase.from("journal_entry_lines").insert([
          { journal_entry_id: je.id, account_id: settings.fuel_cash_account_id, debit: amt, credit: 0, company_id: companyId },
          { journal_entry_id: je.id, account_id: settings.fuel_wallet_liability_account_id, debit: 0, credit: amt, company_id: companyId },
        ]);
      }

      // Update wallet balance
      const newBalance = Number(wallet.balance) + amt;
      await (supabase as any).from("fuel_wallets").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("id", walletId);

      // Record transaction
      await (supabase as any).from("fuel_wallet_transactions").insert({
        company_id: companyId, wallet_id: walletId, type: "recharge",
        amount: amt, balance_after: newBalance, journal_entry_id: journalEntryId, notes,
      });

      // Log message
      await (supabase as any).from("fuel_message_logs").insert({
        company_id: companyId, customer_id: wallet.customer_id, event_type: "wallet_recharge",
        message_text: `${isRTL ? "تم شحن محفظة الوقود بمبلغ" : "Fuel wallet recharged with"} ${amt} SAR. ${isRTL ? "الرصيد الحالي:" : "Current balance:"} ${newBalance} SAR.`,
        status: "logged",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-wallet"] });
      toast({ title: isRTL ? "تم شحن المحفظة" : "Wallet Recharged" });
      navigate("/client/fuel/wallets");
    },
    onError: (e: any) => toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-lg mx-auto">
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
          <p className="text-sm text-muted-foreground">{isRTL ? "الرصيد الحالي:" : "Current balance:"} {Number(wallet?.balance || 0).toLocaleString()} SAR</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isRTL ? "مبلغ الشحن (SAR) *" : "Recharge Amount (SAR) *"}</Label>
            <Input type="number" dir="ltr" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!amount || parseFloat(amount) <= 0 || mutation.isPending} className="w-full gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRTL ? "شحن المحفظة" : "Recharge Wallet"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RechargeWallet;
