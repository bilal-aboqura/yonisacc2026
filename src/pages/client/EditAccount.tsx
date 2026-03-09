import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Save, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";

interface ParentAccount {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  is_parent: boolean;
}

interface CostCenter {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
}

const accountTypes = [
  { value: "asset", label: "أصول", labelEn: "Assets" },
  { value: "liability", label: "خصوم", labelEn: "Liabilities" },
  { value: "equity", label: "حقوق ملكية", labelEn: "Equity" },
  { value: "revenue", label: "إيرادات", labelEn: "Revenue" },
  { value: "expense", label: "مصروفات", labelEn: "Expenses" },
];

const EditAccount = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isGlobal = searchParams.get("global") === "true";
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasTransactions, setHasTransactions] = useState(false);
  const [hasChildren, setHasChildren] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [accountType, setAccountType] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [costCenterId, setCostCenterId] = useState<string>("");
  const [isParent, setIsParent] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSystemAccount, setIsSystemAccount] = useState(false);
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(null);
  const [globalAccountId, setGlobalAccountId] = useState<string | null>(null);

  const [allAccounts, setAllAccounts] = useState<ParentAccount[]>([]);
  const [filteredParents, setFilteredParents] = useState<ParentAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  useEffect(() => {
    if (user && id) {
      fetchInitialData();
    }
  }, [user, id]);

  useEffect(() => {
    setFilteredParents(allAccounts.filter((a) => a.is_parent && a.id !== id));
  }, [allAccounts, id]);

  const fetchInitialData = async () => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!companyData) {
        navigate("/client/accounts");
        return;
      }
      setCompanyId(companyData.id);

      // Fetch parent options
      const [globalRes, companyRes] = await Promise.all([
        supabase
          .from("global_accounts" as any)
          .select("id, code, name, name_en, type, is_parent")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, is_parent")
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .is("global_account_id", null)
          .neq("is_system", true)
          .order("code"),
      ]);

      const globalAccounts: ParentAccount[] = (globalRes.data || []).map((ga: any) => ({
        id: "global_" + ga.id,
        code: ga.code,
        name: ga.name,
        name_en: ga.name_en,
        type: ga.type,
        is_parent: ga.is_parent,
      }));
      setAllAccounts([...globalAccounts, ...(companyRes.data || [])]);

      // Fetch cost centers
      const { data: costCentersData } = await supabase
        .from("cost_centers")
        .select("id, code, name, name_en")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .order("code");
      setCostCenters(costCentersData || []);

      if (isGlobal) {
        // Fetch global account data (supports legacy ids: global_<id> or linked company account id)
        let resolvedGlobalId = (id as string).startsWith("global_")
          ? (id as string).replace("global_", "")
          : (id as string);

        let { data: gaData } = await supabase
          .from("global_accounts" as any)
          .select("*")
          .eq("id", resolvedGlobalId)
          .maybeSingle();

        if (!gaData) {
          // Fallback: id may be a linked company account id
          const { data: linkedLookup, error: linkedLookupError } = await supabase
            .from("accounts")
            .select("global_account_id")
            .eq("id", id as string)
            .eq("company_id", companyData.id)
            .maybeSingle();

          if (linkedLookupError) throw linkedLookupError;
          if (!linkedLookup?.global_account_id) throw new Error("Global account not found");

          resolvedGlobalId = linkedLookup.global_account_id;

          const { data: retryGlobalData, error: retryGlobalError } = await supabase
            .from("global_accounts" as any)
            .select("*")
            .eq("id", resolvedGlobalId)
            .maybeSingle();

          if (retryGlobalError) throw retryGlobalError;
          if (!retryGlobalData) throw new Error("Global account not found");
          gaData = retryGlobalData;
        }

        const ga = gaData as any;

        setCode(ga.code);
        setName(ga.name);
        setNameEn(ga.name_en || "");
        setAccountType(ga.type);
        setIsParent(ga.is_parent || false);
        setIsActive(ga.is_active ?? true);
        setIsSystemAccount(true);
        setGlobalAccountId(resolvedGlobalId);

        // Check for linked company account (for balance)
        const { data: linkedData } = await supabase
          .from("accounts")
          .select("id, balance, cost_center_id")
          .eq("company_id", companyData.id)
          .eq("global_account_id", resolvedGlobalId)
          .maybeSingle();

        if (linkedData) {
          setLinkedAccountId(linkedData.id);
          setOpeningBalance(linkedData.balance || 0);
          setCostCenterId(linkedData.cost_center_id || "");
        }
      } else {
        // Fetch regular company account
        const { data: accountData, error: accountError } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (accountError) throw accountError;
        if (!accountData) {
          toast({
            title: isRTL ? "خطأ" : "Error",
            description: isRTL ? "الحساب غير موجود" : "Account not found",
            variant: "destructive",
          });
          navigate("/client/accounts");
          return;
        }

        setCode(accountData.code);
        setName(accountData.name);
        setNameEn(accountData.name_en || "");
        setAccountType(accountData.type);
        setParentId(accountData.parent_id || "");
        setCostCenterId(accountData.cost_center_id || "");
        setIsParent(accountData.is_parent || false);
        setOpeningBalance(accountData.balance || 0);
        setIsActive(accountData.is_active ?? true);
        setIsSystemAccount(accountData.is_system || false);

        // Check if account has transactions (journal entry lines)
        const { count: jelCount } = await supabase
          .from("journal_entry_lines")
          .select("id", { count: "exact", head: true })
          .eq("account_id", id as string);
        
        // Check if account has children
        const { count: childCount } = await supabase
          .from("accounts")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", id as string)
          .eq("company_id", companyData.id);

        setHasTransactions((jelCount || 0) > 0);
        setHasChildren((childCount || 0) > 0);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ في تحميل البيانات" : "Error loading data",
        variant: "destructive",
      });
      navigate("/client/accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId || !id) return;

    if (!code.trim()) {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "يرجى إدخال رمز الحساب" : "Account code is required", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "يرجى إدخال اسم الحساب" : "Account name is required", variant: "destructive" });
      return;
    }
    if (!accountType) {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "يرجى اختيار نوع الحساب" : "Account type is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (isGlobal && globalAccountId) {
        // For global accounts: only save balance/cost center in linked accounts record
        if (linkedAccountId) {
          // Update existing linked record
          const { error } = await supabase
            .from("accounts")
            .update({
              balance: openingBalance,
              cost_center_id: costCenterId || null,
            })
            .eq("id", linkedAccountId);
          if (error) throw error;
        } else {
          // Create linked record for balance tracking
          const { error } = await supabase
            .from("accounts")
            .insert({
              company_id: companyId,
              global_account_id: globalAccountId,
              code: code,
              name: name,
              name_en: nameEn || null,
              type: accountType,
              is_parent: isParent,
              is_system: true,
              balance: openingBalance,
              cost_center_id: costCenterId || null,
            });
          if (error) throw error;
        }
      } else {
        // Regular company account
        const { data: existingAccount } = await supabase
          .from("accounts")
          .select("id")
          .eq("company_id", companyId)
          .eq("code", code.trim())
          .neq("id", id)
          .maybeSingle();

        if (existingAccount) {
          toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "رمز الحساب موجود مسبقاً" : "Account code already exists", variant: "destructive" });
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from("accounts")
          .update({
            code: code.trim(),
            name: name.trim(),
            name_en: nameEn.trim() || null,
            type: accountType,
            parent_id: parentId || null,
            cost_center_id: costCenterId || null,
            is_parent: isParent,
            balance: openingBalance,
            is_active: isActive,
          })
          .eq("id", id);

        if (error) throw error;
      }

      toast({
        title: isRTL ? "تم الحفظ" : "Saved",
        description: isRTL ? "تم تحديث الحساب بنجاح" : "Account updated successfully",
      });
      navigate("/client/accounts");
    } catch (error: any) {
      console.error("Error saving account:", error);
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ في حفظ الحساب" : "Error saving account",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFieldDisabled = isGlobal; // Global account fields are read-only except balance

  return (
    <div className="space-y-6 max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/accounts")}>
            <ArrowRight className={`h-5 w-5 ${isRTL ? "" : "rotate-180"}`} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "تعديل الحساب" : "Edit Account"}</h1>
            <p className="text-muted-foreground">
              {isRTL ? `تعديل بيانات الحساب: ${code} - ${name}` : `Edit account: ${code} - ${nameEn || name}`}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          {isRTL ? "حفظ التعديلات" : "Save Changes"}
        </Button>
      </div>

      {/* Account Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isRTL ? "بيانات الحساب" : "Account Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Parent Account */}
          {!isGlobal && (
            <div className="space-y-2">
              <Label>{isRTL ? "الحساب الرئيسي" : "Parent Account"}</Label>
              <Select 
                value={parentId || "__none__"} 
                onValueChange={(v) => setParentId(v === "__none__" ? "" : v)}
                disabled={isSystemAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر الحساب الرئيسي (اختياري)" : "Select parent (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{isRTL ? "بدون حساب رئيسي (حساب جذر)" : "No parent (root account)"}</SelectItem>
                  {filteredParents.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {isRTL ? account.name : (account.name_en || account.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "رمز الحساب" : "Account Code"} *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={isRTL ? "مثال: 1101" : "e.g. 1101"}
                className="font-mono"
                disabled={isFieldDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "نوع الحساب" : "Account Type"} *</Label>
              <Select 
                value={accountType} 
                onValueChange={setAccountType}
                disabled={isFieldDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر نوع الحساب" : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {isRTL ? type.label : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الحساب (عربي)" : "Account Name (Arabic)"} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRTL ? "اسم الحساب بالعربي" : "Arabic name"}
                disabled={isFieldDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم الحساب (إنجليزي)" : "Account Name (English)"}</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Account name in English"
                dir="ltr"
                disabled={isFieldDisabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? "مركز التكلفة" : "Cost Center"}</Label>
            <Select 
              value={costCenterId || "__none__"} 
              onValueChange={(v) => setCostCenterId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={isRTL ? "اختر مركز التكلفة (اختياري)" : "Select cost center (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{isRTL ? "بدون مركز تكلفة" : "No cost center"}</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.code} - {isRTL ? cc.name : (cc.name_en || cc.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}</Label>
            <Input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          {!isGlobal && (
            <>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-base">{isRTL ? "حساب رئيسي (تجميعي)" : "Parent Account (Aggregate)"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "تفعيل هذا الخيار إذا كان الحساب يحتوي على حسابات فرعية" : "Enable if this account has sub-accounts"}
                  </p>
                </div>
                <Switch checked={isParent} onCheckedChange={setIsParent} disabled={isSystemAccount} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-base">{isRTL ? "حساب نشط" : "Active Account"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "الحسابات غير النشطة لن تظهر في القوائم" : "Inactive accounts won't appear in lists"}
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditAccount;
