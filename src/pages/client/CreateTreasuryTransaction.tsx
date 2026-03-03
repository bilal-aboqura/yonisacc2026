import { useState, useEffect, forwardRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Save,
  Loader2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  ArrowLeftRight,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useActivePaymentMethods } from "@/hooks/useActivePaymentMethods";

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

const transactionTypes = [
  { value: "receipt", label: "سند قبض", labelEn: "Receipt", icon: Receipt, color: "text-blue-500" },
  { value: "payment", label: "سند صرف", labelEn: "Payment", icon: CreditCard, color: "text-orange-500" },
  { value: "deposit", label: "إيداع", labelEn: "Deposit", icon: ArrowUpRight, color: "text-green-500" },
  { value: "withdrawal", label: "سحب", labelEn: "Withdrawal", icon: ArrowDownRight, color: "text-red-500" },
  { value: "transfer", label: "تحويل", labelEn: "Transfer", icon: ArrowLeftRight, color: "text-purple-500" },
];

// paymentMethods now comes from useActivePaymentMethods hook

const CreateTreasuryTransaction = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "receipt";
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [transactionType, setTransactionType] = useState(initialType);
  const [transactionNumber, setTransactionNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedTreasuryAccount, setSelectedTreasuryAccount] = useState<string>("");
  const [selectedTransferAccount, setSelectedTransferAccount] = useState<string>("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const { data: dbPaymentMethods = [] } = useActivePaymentMethods(companyId);

  const [contactSearch, setContactSearch] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInitialData();
    } else {
      setCompanyId(null);
      setContacts([]);
      setTreasuryAccounts([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (companyId) generateTransactionNumber();
  }, [transactionType, companyId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!companyData) throw new Error("NO_ACTIVE_COMPANY");

      setCompanyId(companyData.id);

      const [contactsRes, accountsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, name, name_en, type, account_id")
          .eq("company_id", companyData.id)
          .eq("is_active", true),
        supabase
          .from("accounts")
          .select("id, code, name, name_en")
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .like("code", "111%")
          .order("code"),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setContacts(contactsRes.data || []);
      setTreasuryAccounts(accountsRes.data || []);

      // Auto-select first treasury account
      if (accountsRes.data && accountsRes.data.length > 0) {
        setSelectedTreasuryAccount(accountsRes.data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: error?.message === "NO_ACTIVE_COMPANY"
          ? "لا توجد شركة نشطة مرتبطة بهذا الحساب"
          : "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTransactionNumber = async () => {
    if (!companyId) return;
    const prefixes: Record<string, string> = {
      deposit: "DEP-",
      withdrawal: "WTH-",
      receipt: "RV-",
      payment: "PV-",
      transfer: "TRF-",
    };
    const { count } = await supabase
      .from("treasury_transactions")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("type", transactionType);
    setTransactionNumber(`${prefixes[transactionType]}${String((count || 0) + 1).padStart(6, "0")}`);
  };

  const handleSave = async () => {
    if (!companyId) return;

    if (amount <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    if (!selectedTreasuryAccount) {
      toast({ title: "خطأ", description: "يرجى اختيار حساب الخزينة / البنك", variant: "destructive" });
      return;
    }

    if ((transactionType === "receipt" || transactionType === "payment") && !selectedContact) {
      toast({
        title: "خطأ",
        description: transactionType === "receipt" ? "يرجى اختيار العميل" : "يرجى اختيار المورد",
        variant: "destructive",
      });
      return;
    }

    if ((transactionType === "deposit" || transactionType === "withdrawal" || transactionType === "transfer") && !selectedTransferAccount) {
      toast({ title: "خطأ", description: "يرجى اختيار الحساب المقابل", variant: "destructive" });
      return;
    }

    if (selectedContact && !selectedContact.account_id) {
      toast({
        title: "خطأ",
        description: "هذا الجهة ليس لها حساب مرتبط في دليل الحسابات. يرجى ربطه أولاً.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
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
        title: "تم الحفظ بنجاح",
        description: `تم تسجيل العملية وإنشاء القيد المحاسبي ${data?.journal_entry_number || ""} تلقائياً`,
      });

      navigate("/client/treasury");
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      let errMsg = "حدث خطأ في حفظ العملية";
      if (error?.message?.includes("linked GL account")) {
        errMsg = "الجهة المختارة ليس لها حساب في دليل الحسابات";
      } else if (error?.message?.includes("Cash or Bank")) {
        errMsg = "حساب الخزينة يجب أن يكون من حسابات النقدية أو البنوك";
      } else if (error?.message?.includes("Contact is required")) {
        errMsg = "يجب اختيار العميل أو المورد";
      } else if (error?.message) {
        errMsg = error.message;
      }
      toast({ title: "خطأ", description: errMsg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.name_en?.toLowerCase().includes(contactSearch.toLowerCase());
    if (transactionType === "receipt") return matchesSearch && (c.type === "customer" || c.type === "both");
    if (transactionType === "payment") return matchesSearch && (c.type === "vendor" || c.type === "both");
    return matchesSearch;
  });

  const needsContact = transactionType === "receipt" || transactionType === "payment";
  const needsTransferAccount = transactionType === "deposit" || transactionType === "withdrawal" || transactionType === "transfer";

  const getTypeInfo = () => transactionTypes.find((t) => t.value === transactionType)!;
  const TypeIcon = getTypeInfo().icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-6 rtl max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/treasury")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">عملية خزينة جديدة</h1>
            <p className="text-muted-foreground">تسجيل عملية مالية مع قيد محاسبي تلقائي</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          <Save className="h-4 w-4 ml-2" />
          حفظ العملية
        </Button>
      </div>

      {/* Auto Journal Entry Badge */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <BookOpen className="h-5 w-5 text-primary" />
        <span className="text-sm text-primary font-medium">
          سيتم إنشاء قيد محاسبي تلقائي عند حفظ العملية
        </span>
      </div>

      {/* Transaction Type Tabs */}
      <Tabs value={transactionType} onValueChange={(v) => { setTransactionType(v); setSelectedContact(null); setSelectedTransferAccount(""); }}>
        <TabsList className="grid grid-cols-5 w-full">
          {transactionTypes.map((type) => (
            <TabsTrigger key={type.value} value={type.value} className="gap-1 text-xs">
              <type.icon className={`h-4 w-4 ${type.color}`} />
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {transactionTypes.map((type) => (
          <TabsContent key={type.value} value={type.value}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TypeIcon className={`h-5 w-5 ${getTypeInfo().color}`} />
                  {getTypeInfo().label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Transaction Details */}
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

                {/* Amount */}
                <div className="space-y-2">
                  <Label>المبلغ *</Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="text-2xl font-bold h-14"
                  />
                </div>

                {/* Treasury Account (Cash/Bank) */}
                <div className="space-y-2">
                  <Label>حساب الخزينة / البنك *</Label>
                  <Select value={selectedTreasuryAccount} onValueChange={setSelectedTreasuryAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر حساب الخزينة أو البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      {treasuryAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs ml-2">{acc.code}</span> {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {treasuryAccounts.length === 0 && (
                    <p className="text-xs text-destructive">لا توجد حسابات نقدية أو بنكية. يرجى إنشاؤها أولاً في دليل الحسابات تحت "النقدية والبنوك" (111)</p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dbPaymentMethods.length > 0 ? dbPaymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.code}>{method.name}</SelectItem>
                      )) : (
                        <>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Transfer Account (for deposit/withdrawal/transfer) */}
                {needsTransferAccount && (
                  <div className="space-y-2">
                    <Label>
                      {transactionType === "deposit" ? "من حساب (المصدر)" :
                       transactionType === "withdrawal" ? "إلى حساب (الوجهة)" :
                       "إلى حساب (التحويل إليه)"}
                       *
                    </Label>
                    <Select value={selectedTransferAccount} onValueChange={setSelectedTransferAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب المقابل" />
                      </SelectTrigger>
                      <SelectContent>
                        {treasuryAccounts
                          .filter((acc) => acc.id !== selectedTreasuryAccount)
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <span className="font-mono text-xs ml-2">{acc.code}</span> {acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Contact Selection (for receipts/payments) */}
                {needsContact && (
                  <div className="space-y-2">
                    <Label>{transactionType === "receipt" ? "العميل *" : "المورد *"}</Label>
                    {selectedContact ? (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <span className="font-medium">{selectedContact.name}</span>
                          {selectedContact.account_id ? (
                            <Badge variant="secondary" className="mr-2 text-xs">مرتبط بالحسابات</Badge>
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
                                <p className="text-center text-muted-foreground py-4">
                                  لا يوجد {transactionType === "receipt" ? "عملاء" : "موردين"}
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}

                {/* Journal Entry Preview */}
                {amount > 0 && selectedTreasuryAccount && (
                  <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        معاينة القيد المحاسبي
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          const treasuryAcc = treasuryAccounts.find(a => a.id === selectedTreasuryAccount);
                          const transferAcc = treasuryAccounts.find(a => a.id === selectedTransferAccount);
                          const tName = treasuryAcc ? `${treasuryAcc.code} - ${treasuryAcc.name}` : "...";
                          const contactName = selectedContact?.name || "...";
                          const trName = transferAcc ? `${transferAcc.code} - ${transferAcc.name}` : "...";

                          let debitLine = "";
                          let creditLine = "";

                          switch (transactionType) {
                            case "receipt":
                              debitLine = tName;
                              creditLine = contactName;
                              break;
                            case "payment":
                              debitLine = contactName;
                              creditLine = tName;
                              break;
                            case "deposit":
                              debitLine = tName;
                              creditLine = trName;
                              break;
                            case "withdrawal":
                              debitLine = trName;
                              creditLine = tName;
                              break;
                            case "transfer":
                              debitLine = trName;
                              creditLine = tName;
                              break;
                          }

                          return (
                            <table className="w-full">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-right pb-1">الحساب</th>
                                  <th className="text-center pb-1 w-24">مدين</th>
                                  <th className="text-center pb-1 w-24">دائن</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="py-1">{debitLine}</td>
                                  <td className="text-center font-mono text-green-600">{amount.toLocaleString()}</td>
                                  <td className="text-center">-</td>
                                </tr>
                                <tr>
                                  <td className="py-1">{creditLine}</td>
                                  <td className="text-center">-</td>
                                  <td className="text-center font-mono text-red-500">{amount.toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Reference Number */}
                <div className="space-y-2">
                  <Label>رقم المرجع (اختياري)</Label>
                  <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="رقم الشيك أو الحوالة..." />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>البيان</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف العملية..." rows={3} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
});

CreateTreasuryTransaction.displayName = "CreateTreasuryTransaction";

export default CreateTreasuryTransaction;
