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
import {
  ArrowRight,
  Save,
  Wallet,
  Loader2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  name_en: string | null;
  type: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

const transactionTypes = [
  { value: "deposit", label: "إيداع", icon: ArrowUpRight, color: "text-green-500" },
  { value: "withdrawal", label: "سحب", icon: ArrowDownRight, color: "text-red-500" },
  { value: "receipt", label: "سند قبض", icon: Receipt, color: "text-blue-500" },
  { value: "payment", label: "سند صرف", icon: CreditCard, color: "text-orange-500" },
];

const paymentMethods = [
  { value: "cash", label: "نقدي" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "check", label: "شيك" },
  { value: "credit_card", label: "بطاقة ائتمان" },
];

const CreateTreasuryTransaction = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "deposit";
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
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [contactSearch, setContactSearch] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInitialData();
      return;
    }

    setCompanyId(null);
    setContacts([]);
    setAccounts([]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (companyId) {
      generateTransactionNumber();
    }
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
      if (!companyData) {
        throw new Error("NO_ACTIVE_COMPANY");
      }

      setCompanyId(companyData.id);

      const [contactsRes, accountsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, name, name_en, type")
          .eq("company_id", companyData.id)
          .eq("is_active", true),
        supabase
          .from("accounts")
          .select("id, code, name, type")
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .or("is_parent.is.null,is_parent.eq.false")
          .in("type", ["asset"])
          .order("code"),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setContacts(contactsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      const description = error?.message === "NO_ACTIVE_COMPANY"
        ? "لا توجد شركة نشطة مرتبطة بهذا الحساب"
        : "حدث خطأ في تحميل البيانات";

      toast({
        title: "خطأ",
        description,
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
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("treasury_transactions").insert({
        company_id: companyId,
        transaction_number: transactionNumber,
        transaction_date: transactionDate,
        type: transactionType,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        description: description || null,
        contact_id: selectedContact?.id || null,
        account_id: selectedAccount?.id || null,
        created_by: user?.id,
        status: "confirmed",
      });

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم تسجيل العملية بنجاح",
      });

      navigate("/client/treasury");
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ العملية",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.name_en?.toLowerCase().includes(contactSearch.toLowerCase());
    
    // Filter by type based on transaction type
    if (transactionType === "receipt") {
      return matchesSearch && c.type === "customer";
    } else if (transactionType === "payment") {
      return matchesSearch && c.type === "vendor";
    }
    return matchesSearch;
  });

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
            <p className="text-muted-foreground">تسجيل إيداع أو سحب أو سند</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          <Save className="h-4 w-4 ml-2" />
          حفظ العملية
        </Button>
      </div>

      {/* Transaction Type Tabs */}
      <Tabs value={transactionType} onValueChange={setTransactionType}>
        <TabsList className="grid grid-cols-4 w-full">
          {transactionTypes.map((type) => (
            <TabsTrigger key={type.value} value={type.value} className="gap-2">
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
                    <Input
                      value={transactionNumber}
                      onChange={(e) => setTransactionNumber(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <Input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>المبلغ *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="text-2xl font-bold h-14"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Selection */}
                <div className="space-y-2">
                  <Label>الحساب</Label>
                  <Select
                    value={selectedAccount?.id || ""}
                    onValueChange={(v) => {
                      const account = accounts.find((a) => a.id === v);
                      setSelectedAccount(account || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Selection (for receipts/payments) */}
                {(transactionType === "receipt" || transactionType === "payment") && (
                  <div className="space-y-2">
                    <Label>{transactionType === "receipt" ? "العميل" : "المورد"}</Label>
                    {selectedContact ? (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{selectedContact.name}</span>
                        <Button variant="outline" size="sm" onClick={() => setSelectedContact(null)}>
                          تغيير
                        </Button>
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
                            <DialogTitle>
                              اختيار {transactionType === "receipt" ? "العميل" : "المورد"}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="بحث..."
                              value={contactSearch}
                              onChange={(e) => setContactSearch(e.target.value)}
                            />
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                              {filteredContacts.map((contact) => (
                                <div
                                  key={contact.id}
                                  className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                                  onClick={() => {
                                    setSelectedContact(contact);
                                    setContactDialogOpen(false);
                                  }}
                                >
                                  <p className="font-medium">{contact.name}</p>
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

                {/* Reference Number */}
                <div className="space-y-2">
                  <Label>رقم المرجع (اختياري)</Label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="رقم الشيك أو الحوالة..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>البيان</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="وصف العملية..."
                    rows={3}
                  />
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
