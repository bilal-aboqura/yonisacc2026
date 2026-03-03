import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Building2, ShoppingCart, Store, Package } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  is_parent: boolean | null;
}

interface Branch {
  id: string;
  name: string;
  name_en: string | null;
  is_active: boolean | null;
}

interface BranchAccountSettingsProps {
  companyId: string;
}

const BranchAccountSettings = ({ companyId }: BranchAccountSettingsProps) => {
  const { isRTL } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sales settings
  const [salesRevenueAccount, setSalesRevenueAccount] = useState<string>("");
  const [salesDiscountAccount, setSalesDiscountAccount] = useState<string>("");
  const [salesTaxAccount, setSalesTaxAccount] = useState<string>("");
  const [salesReceivableAccount, setSalesReceivableAccount] = useState<string>("");

  // Purchase settings
  const [purchaseExpenseAccount, setPurchaseExpenseAccount] = useState<string>("");
  const [purchaseDiscountAccount, setPurchaseDiscountAccount] = useState<string>("");
  const [purchaseTaxAccount, setPurchaseTaxAccount] = useState<string>("");
  const [purchasePayableAccount, setPurchasePayableAccount] = useState<string>("");

  // Inventory settings
  const [inventoryAccount, setInventoryAccount] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [companyId]);

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchSettings(selectedBranch);
    }
  }, [selectedBranch]);

  const fetchData = async () => {
    try {
      const [branchesRes, accountsRes] = await Promise.all([
        supabase.from("branches").select("id, name, name_en, is_active").eq("company_id", companyId).order("is_main", { ascending: false }).order("name"),
        supabase.from("accounts").select("id, code, name, name_en, type, is_parent").eq("company_id", companyId).eq("is_active", true).order("code"),
      ]);

      setBranches(branchesRes.data || []);
      setAccounts((accountsRes.data || []).filter(a => !a.is_parent));

      if (branchesRes.data && branchesRes.data.length > 0) {
        setSelectedBranch(branchesRes.data[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchSettings = async (branchId: string) => {
    // Reset
    setSalesRevenueAccount("");
    setSalesDiscountAccount("");
    setSalesTaxAccount("");
    setSalesReceivableAccount("");
    setPurchaseExpenseAccount("");
    setPurchaseDiscountAccount("");
    setPurchaseTaxAccount("");
    setPurchasePayableAccount("");
    setInventoryAccount("");

    const { data } = await supabase
      .from("branch_account_settings" as any)
      .select("*")
      .eq("branch_id", branchId)
      .eq("company_id", companyId);

    if (data) {
      for (const row of data as any[]) {
        if (row.module_type === "sales") {
          setSalesRevenueAccount(row.sales_revenue_account_id || "");
          setSalesDiscountAccount(row.sales_discount_account_id || "");
          setSalesTaxAccount(row.sales_tax_account_id || "");
          setSalesReceivableAccount(row.sales_receivable_account_id || "");
          setInventoryAccount(row.inventory_account_id || "");
        } else if (row.module_type === "purchases") {
          setPurchaseExpenseAccount(row.purchase_expense_account_id || "");
          setPurchaseDiscountAccount(row.purchase_discount_account_id || "");
          setPurchaseTaxAccount(row.purchase_tax_account_id || "");
          setPurchasePayableAccount(row.purchase_payable_account_id || "");
        }
      }
    }
  };

  const handleSave = async (moduleType: "sales" | "purchases") => {
    if (!selectedBranch) return;
    setSaving(true);

    try {
      const payload: any = {
        company_id: companyId,
        branch_id: selectedBranch,
        module_type: moduleType,
        updated_at: new Date().toISOString(),
      };

      if (moduleType === "sales") {
        payload.sales_revenue_account_id = salesRevenueAccount || null;
        payload.sales_discount_account_id = salesDiscountAccount || null;
        payload.sales_tax_account_id = salesTaxAccount || null;
        payload.sales_receivable_account_id = salesReceivableAccount || null;
        payload.inventory_account_id = inventoryAccount || null;
      } else {
        payload.purchase_expense_account_id = purchaseExpenseAccount || null;
        payload.purchase_discount_account_id = purchaseDiscountAccount || null;
        payload.purchase_tax_account_id = purchaseTaxAccount || null;
        payload.purchase_payable_account_id = purchasePayableAccount || null;
      }

      // Upsert based on unique constraint (branch_id, module_type)
      const { error } = await (supabase.from("branch_account_settings" as any) as any)
        .upsert(payload, { onConflict: "branch_id,module_type" });

      if (error) throw error;

      toast.success(isRTL ? "تم حفظ إعدادات الحسابات بنجاح" : "Account settings saved successfully");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || (isRTL ? "خطأ في الحفظ" : "Error saving"));
    } finally {
      setSaving(false);
    }
  };

  const renderAccountSelect = (
    label: string,
    labelEn: string,
    value: string,
    onChange: (v: string) => void,
    filterType?: string[]
  ) => {
    const filtered = filterType
      ? accounts.filter(a => filterType.includes(a.type))
      : accounts;

    return (
      <div className="space-y-2">
        <Label>{isRTL ? label : labelEn}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={isRTL ? "اختر الحساب" : "Select account"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
            {filtered.map(account => (
              <SelectItem key={account.id} value={account.id}>
                {account.code} - {isRTL ? account.name : (account.name_en || account.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isRTL ? "لا توجد فروع. يرجى إنشاء فرع أولاً." : "No branches found. Please create a branch first."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isRTL ? "إعدادات حسابات الفروع" : "Branch Accounting Configuration"}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? "تخصيص الحسابات المحاسبية لكل فرع لتوليد القيود آلياً"
              : "Configure accounting accounts per branch for automatic journal entry generation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isRTL ? "اختر الفرع" : "Select Branch"}</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {isRTL ? branch.name : (branch.name_en || branch.name)}
                    {!branch.is_active ? (isRTL ? " (غير نشط)" : " (Inactive)") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedBranch && (
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="sales" className="gap-2">
              <Store className="h-4 w-4" />
              {isRTL ? "حسابات المبيعات" : "Sales Accounts"}
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              {isRTL ? "حسابات المشتريات" : "Purchase Accounts"}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="h-4 w-4" />
              {isRTL ? "حساب المخزون" : "Inventory Account"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? "حسابات المبيعات للفرع" : "Branch Sales Accounts"}
                </CardTitle>
                <CardDescription>
                  {isRTL
                    ? "الحسابات المستخدمة عند تأكيد فواتير المبيعات لهذا الفرع"
                    : "Accounts used when confirming sales invoices for this branch"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {renderAccountSelect("حساب إيرادات المبيعات", "Sales Revenue Account", salesRevenueAccount, v => setSalesRevenueAccount(v === "none" ? "" : v), ["revenue"])}
                  {renderAccountSelect("حساب خصم المبيعات", "Sales Discount Account", salesDiscountAccount, v => setSalesDiscountAccount(v === "none" ? "" : v), ["expense"])}
                  {renderAccountSelect("حساب ضريبة المبيعات", "Sales Tax Account", salesTaxAccount, v => setSalesTaxAccount(v === "none" ? "" : v), ["liability"])}
                  {renderAccountSelect("حساب الذمم المدينة", "Receivable Account", salesReceivableAccount, v => setSalesReceivableAccount(v === "none" ? "" : v), ["asset"])}
                  {renderAccountSelect("حساب المخزون", "Inventory Account", inventoryAccount, v => setInventoryAccount(v === "none" ? "" : v), ["asset"])}
                </div>
                <Button onClick={() => handleSave("sales")} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  <Save className="h-4 w-4 me-2" />
                  {isRTL ? "حفظ إعدادات المبيعات" : "Save Sales Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? "حسابات المشتريات للفرع" : "Branch Purchase Accounts"}
                </CardTitle>
                <CardDescription>
                  {isRTL
                    ? "الحسابات المستخدمة عند تأكيد فواتير المشتريات لهذا الفرع"
                    : "Accounts used when confirming purchase invoices for this branch"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {renderAccountSelect("حساب مصروفات المشتريات", "Purchase Expense Account", purchaseExpenseAccount, v => setPurchaseExpenseAccount(v === "none" ? "" : v), ["expense"])}
                  {renderAccountSelect("حساب خصم المشتريات", "Purchase Discount Account", purchaseDiscountAccount, v => setPurchaseDiscountAccount(v === "none" ? "" : v), ["revenue"])}
                  {renderAccountSelect("حساب ضريبة المشتريات", "Purchase Tax Account", purchaseTaxAccount, v => setPurchaseTaxAccount(v === "none" ? "" : v), ["asset"])}
                  {renderAccountSelect("حساب الذمم الدائنة", "Payable Account", purchasePayableAccount, v => setPurchasePayableAccount(v === "none" ? "" : v), ["liability"])}
                </div>
                <Button onClick={() => handleSave("purchases")} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  <Save className="h-4 w-4 me-2" />
                  {isRTL ? "حفظ إعدادات المشتريات" : "Save Purchase Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? "حساب المخزون للفرع" : "Branch Inventory Account"}
                </CardTitle>
                <CardDescription>
                  {isRTL
                    ? "حساب المخزون المستخدم لتتبع قيمة المخزون في هذا الفرع"
                    : "Inventory account used to track inventory value for this branch"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {renderAccountSelect("حساب المخزون", "Inventory Account", inventoryAccount, v => setInventoryAccount(v === "none" ? "" : v), ["asset"])}
                </div>
                <Button onClick={() => handleSave("sales")} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  <Save className="h-4 w-4 me-2" />
                  {isRTL ? "حفظ إعدادات المخزون" : "Save Inventory Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default BranchAccountSettings;
