import { useState, useEffect, forwardRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Save, Loader2, Search, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Contact {
  id: string;
  name: string;
  name_en: string | null;
  type: string;
  account_id: string | null;
}

interface TreasuryAccount {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
}

const typeLabels: Record<string, string> = {
  receipt: "سند قبض",
  payment: "سند صرف",
  deposit: "إيداع",
  withdrawal: "سحب",
  transfer: "تحويل",
};

const paymentMethods = [
  { value: "cash", label: "نقدي" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "check", label: "شيك" },
  { value: "credit_card", label: "بطاقة ائتمان" },
];

const EditTreasuryTransaction = forwardRef<HTMLDivElement>((_, ref) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState("");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedTreasuryAccount, setSelectedTreasuryAccount] = useState("");
  const [selectedTransferAccount, setSelectedTransferAccount] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [oldJournalEntryId, setOldJournalEntryId] = useState<string | null>(null);

  const { data: tx, isLoading } = useQuery({
    queryKey: ["edit-treasury-tx", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("treasury_transactions")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (tx && user) {
      setTransactionType(tx.type);
      setTransactionNumber(tx.transaction_number);
      setTransactionDate(tx.transaction_date);
      setAmount(Number(tx.amount) || 0);
      setPaymentMethod((tx as any).payment_method || "cash");
      setReferenceNumber((tx as any).reference_number || "");
      setDescription(tx.description || "");
      setSelectedTreasuryAccount((tx as any).treasury_account_id || "");
      setSelectedTransferAccount((tx as any).transfer_account_id || "");
      setOldJournalEntryId(tx.journal_entry_id || null);
      fetchCompanyData(tx.contact_id);
    }
  }, [tx, user]);

  const fetchCompanyData = async (contactId: string | null) => {
    const { data: companyData } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user?.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!companyData) return;
    setCompanyId(companyData.id);

    const [contactsRes, accountsRes] = await Promise.all([
      supabase.from("contacts").select("id, name, name_en, type, account_id").eq("company_id", companyData.id).eq("is_active", true),
      supabase.from("accounts").select("id, code, name, name_en").eq("company_id", companyData.id).eq("is_active", true).or("is_parent.is.null,is_parent.eq.false").like("code", "111%").order("code"),
    ]);

    setContacts(contactsRes.data || []);
    setTreasuryAccounts(accountsRes.data || []);

    if (contactId) {
      const found = (contactsRes.data || []).find((c) => c.id === contactId);
      if (found) setSelectedContact(found);
    }
  };

  const handleSave = async () => {
    if (!companyId || !id) return;

    if (amount <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Delete old journal entry
      if (oldJournalEntryId) {
        await supabase.from("journal_entry_lines").delete().eq("entry_id", oldJournalEntryId);
        await supabase.from("journal_entries").delete().eq("id", oldJournalEntryId);
      }

      // Delete old transaction
      await supabase.from("treasury_transactions").delete().eq("id", id);

      // Create new one via RPC
      const { data, error } = await (supabase.rpc as any)("post_treasury_transaction", {
        p_company_id: companyId,
        p_type: transactionType,
        p_amount: amount,
        p_treasury_account_id: selectedTreasuryAccount,
        p_transaction_date: transactionDate,
        p_transaction_number: transactionNumber,
        p_description: description || null,
        p_contact_id: selectedContact?.id || null,
        p_transfer_account_id: selectedTransferAccount || null,
        p_payment_method: paymentMethod,
        p_reference_number: referenceNumber || null,
        p_invoice_id: null,
        p_created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "تم التعديل بنجاح",
        description: `تم تحديث العملية وإعادة إنشاء القيد المحاسبي ${data?.journal_entry_number || ""} تلقائياً`,
      });

      // Invalidate all balance-related queries
      queryClient.invalidateQueries({ queryKey: ["treasury-overview"] });
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["general-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["client-accounts"] });

      navigate("/client/treasury");
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast({ title: "خطأ", description: error?.message || "حدث خطأ في تعديل العملية", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const needsContact = transactionType === "receipt" || transactionType === "payment";
  const needsTransferAccount = transactionType === "deposit" || transactionType === "withdrawal" || transactionType === "transfer";

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.name_en?.toLowerCase().includes(contactSearch.toLowerCase());
    if (transactionType === "receipt") return matchesSearch && (c.type === "customer" || c.type === "both");
    if (transactionType === "payment") return matchesSearch && (c.type === "vendor" || c.type === "both");
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">العملية غير موجودة</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/client/treasury")}>العودة</Button>
      </div>
    );
  }

  if (tx.status === "reversed") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">لا يمكن تعديل عملية معكوسة</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/client/treasury")}>العودة</Button>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-6 rtl max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/treasury")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">تعديل عملية الخزينة</h1>
            <p className="text-muted-foreground font-mono">{transactionNumber}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          <Save className="h-4 w-4 ml-2" />
          حفظ التعديلات
        </Button>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <BookOpen className="h-5 w-5 text-amber-600" />
        <span className="text-sm text-amber-700 font-medium">
          عند الحفظ سيتم حذف القيد القديم وإنشاء قيد محاسبي جديد تلقائياً
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Badge variant="secondary">{typeLabels[transactionType] || transactionType}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رقم العملية</Label>
              <Input value={transactionNumber} onChange={(e) => setTransactionNumber(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>المبلغ *</Label>
            <Input
              type="number" min="0" step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="text-2xl font-bold h-14"
            />
          </div>

          <div className="space-y-2">
            <Label>حساب الخزينة / البنك *</Label>
            <Select value={selectedTreasuryAccount} onValueChange={setSelectedTreasuryAccount}>
              <SelectTrigger><SelectValue placeholder="اختر حساب الخزينة أو البنك" /></SelectTrigger>
              <SelectContent>
                {treasuryAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <span className="font-mono text-xs ml-2">{acc.code}</span> {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>طريقة الدفع</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsTransferAccount && (
            <div className="space-y-2">
              <Label>الحساب المقابل *</Label>
              <Select value={selectedTransferAccount} onValueChange={setSelectedTransferAccount}>
                <SelectTrigger><SelectValue placeholder="اختر الحساب المقابل" /></SelectTrigger>
                <SelectContent>
                  {treasuryAccounts.filter((acc) => acc.id !== selectedTreasuryAccount).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="font-mono text-xs ml-2">{acc.code}</span> {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsContact && (
            <div className="space-y-2">
              <Label>{transactionType === "receipt" ? "العميل *" : "المورد *"}</Label>
              {selectedContact ? (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <span className="font-medium">{selectedContact.name}</span>
                    {selectedContact.account_id ? (
                      <Badge variant="secondary" className="mr-2 text-xs">مرتبط</Badge>
                    ) : (
                      <Badge variant="destructive" className="mr-2 text-xs">غير مرتبط!</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedContact(null)}>تغيير</Button>
                </div>
              ) : (
                <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <Search className="h-4 w-4" />
                      اختيار {transactionType === "receipt" ? "العميل" : "المورد"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>اختيار {transactionType === "receipt" ? "العميل" : "المورد"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input placeholder="بحث..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="p-3 border rounded-lg hover:bg-muted cursor-pointer flex items-center justify-between"
                            onClick={() => { setSelectedContact(contact); setContactDialogOpen(false); }}
                          >
                            <p className="font-medium">{contact.name}</p>
                            {contact.account_id ? (
                              <Badge variant="secondary" className="text-xs">مرتبط</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">غير مرتبط</Badge>
                            )}
                          </div>
                        ))}
                        {filteredContacts.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">لا يوجد نتائج</p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>رقم المرجع (اختياري)</Label>
            <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>البيان</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

EditTreasuryTransaction.displayName = "EditTreasuryTransaction";

export default EditTreasuryTransaction;
