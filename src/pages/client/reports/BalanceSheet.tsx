import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import useTenantIsolation from "@/hooks/useTenantIsolation";
import { toast } from "@/hooks/use-toast";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { useQuery } from "@tanstack/react-query";
import ReportActions from "@/components/print/ReportActions";
import { PrintableDocument, CompanyInfo } from "@/components/print/types";
import { exportToExcel } from "@/lib/exportUtils";

interface RawAccount {
  id: string; code: string; name: string; name_en: string | null;
  type: string; parent_id: string | null; is_parent: boolean | null; is_active: boolean | null;
}

interface TreeNode {
  account: RawAccount; balance: number; children: TreeNode[]; depth: number;
}

const BalanceSheet = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<RawAccount[]>([]);
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: company } = useQuery({
    queryKey: ["company-info-full", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies").select("name, name_en, logo_url, tax_number, commercial_register, address, phone, email").eq("id", companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { settings: printSettings } = usePrintSettings(companyId);

  useEffect(() => { if (companyId) fetchData(); }, [companyId]);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [accountsRes, balanceRes] = await Promise.all([
        supabase.from("accounts").select("id, code, name, name_en, type, parent_id, is_parent, is_active")
          .eq("company_id", companyId).eq("is_active", true).in("type", ["asset", "liability", "equity", "revenue", "expense"]).order("code"),
        (supabase.rpc as any)("get_account_balances", { p_company_id: companyId }),
      ]);
      if (accountsRes.error) throw accountsRes.error;
      if (balanceRes.error) throw balanceRes.error;
      setAccounts(accountsRes.data || []);
      const bMap = new Map<string, number>();
      if (balanceRes.data && typeof balanceRes.data === "object") {
        Object.entries(balanceRes.data).forEach(([id, bal]) => bMap.set(id, Number(bal) || 0));
      }
      setBalanceMap(bMap);
      const rootIds = new Set<string>();
      (accountsRes.data || []).forEach((a: RawAccount) => {
        if (!a.parent_id && a.is_parent && ["asset", "liability", "equity"].includes(a.type)) rootIds.add(a.id);
      });
      setExpandedNodes(rootIds);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "حدث خطأ في تحميل البيانات" : "Failed to load data", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const buildTree = (items: RawAccount[], parentId: string | null, depth: number): TreeNode[] => {
    return items.filter((a) => a.parent_id === parentId).map((a) => {
      const children = buildTree(items, a.id, depth + 1);
      const rawBalance = balanceMap.get(a.id) || 0;
      const leafBalance = a.type === "asset" ? rawBalance : Math.abs(rawBalance);
      const childrenSum = children.reduce((s, c) => s + c.balance, 0);
      const balance = children.length > 0 ? childrenSum : leafBalance;
      return { account: a, balance, children, depth };
    });
  };

  const filterType = (type: string) => accounts.filter((a) => a.type === type);
  const assetTree = useMemo(() => buildTree(filterType("asset"), null, 0), [accounts, balanceMap]);
  const liabilityTree = useMemo(() => buildTree(filterType("liability"), null, 0), [accounts, balanceMap]);
  const equityTree = useMemo(() => buildTree(filterType("equity"), null, 0), [accounts, balanceMap]);

  const revenueAccounts = useMemo(() => filterType("revenue"), [accounts]);
  const expenseAccounts = useMemo(() => filterType("expense"), [accounts]);
  const totalRevenue = revenueAccounts.filter((a) => !a.is_parent).reduce((s, a) => s + Math.abs(balanceMap.get(a.id) || 0), 0);
  const totalExpenseVal = expenseAccounts.filter((a) => !a.is_parent).reduce((s, a) => s + Math.abs(balanceMap.get(a.id) || 0), 0);
  const netIncome = totalRevenue - totalExpenseVal;

  const sumTree = (nodes: TreeNode[]): number => nodes.reduce((s, n) => s + n.balance, 0);
  const totalAssets = sumTree(assetTree);
  const totalLiabilities = sumTree(liabilityTree);
  const totalEquity = sumTree(equityTree);
  const totalEquityWithIncome = totalEquity + netIncome;
  const totalLiabAndEquity = totalLiabilities + totalEquityWithIncome;
  const isBalanced = Math.abs(totalAssets - totalLiabAndEquity) < 0.01;

  const formatCurrency = (amount: number) => amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currency = isRTL ? "ر.س" : "SAR";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const accountName = (acc: RawAccount) => (isRTL ? acc.name : acc.name_en || acc.name);

  const flattenTree = (nodes: TreeNode[], section: string): { code: string; name: string; amount: number }[] => {
    const result: any[] = [];
    const walk = (ns: TreeNode[]) => {
      ns.forEach((n) => {
        result.push({ code: n.account.code, name: accountName(n.account), amount: n.balance, section });
        if (n.children.length > 0) walk(n.children);
      });
    };
    walk(nodes);
    return result;
  };

  const printDoc: PrintableDocument = useMemo(() => {
    const assetRows = flattenTree(assetTree, isRTL ? "أصول" : "Assets");
    const liabRows = flattenTree(liabilityTree, isRTL ? "خصوم" : "Liabilities");
    const eqRows = flattenTree(equityTree, isRTL ? "حقوق ملكية" : "Equity");
    const allRows = [
      ...assetRows.map(r => [r.code, r.name, r.amount] as (string | number)[]),
      ["", isRTL ? "إجمالي الأصول" : "Total Assets", totalAssets],
      ["", "", ""],
      ...liabRows.map(r => [r.code, r.name, r.amount] as (string | number)[]),
      ["", isRTL ? "إجمالي الخصوم" : "Total Liabilities", totalLiabilities],
      ["", "", ""],
      ...eqRows.map(r => [r.code, r.name, r.amount] as (string | number)[]),
      ["", netIncome >= 0 ? (isRTL ? "صافي ربح الفترة" : "Net Income") : (isRTL ? "صافي خسارة الفترة" : "Net Loss"), Math.abs(netIncome)],
      ["", isRTL ? "إجمالي حقوق الملكية" : "Total Equity", totalEquityWithIncome],
    ];
    return {
      title: isRTL ? "الميزانية العمومية" : "Balance Sheet",
      date: new Date().toISOString().split("T")[0],
      table: {
        headers: [isRTL ? "الرمز" : "Code", isRTL ? "البيان" : "Description", isRTL ? "المبلغ" : "Amount"],
        rows: allRows,
        totals: ["", isRTL ? "الخصوم + حقوق الملكية" : "Liabilities + Equity", totalLiabAndEquity],
      },
    };
  }, [assetTree, liabilityTree, equityTree, totalAssets, totalLiabilities, totalEquityWithIncome, totalLiabAndEquity, netIncome, isRTL]);

  const companyInfo: CompanyInfo = {
    name: company?.name || "", name_en: company?.name_en,
    logo_url: company?.logo_url, tax_number: company?.tax_number,
    commercial_register: company?.commercial_register, address: company?.address,
    phone: company?.phone, email: company?.email,
  };

  const handleExportExcel = () => {
    const today = new Date().toISOString().split("T")[0];
    const allRows = [
      ...flattenTree(assetTree, isRTL ? "أصول" : "Assets"),
      { code: "", name: isRTL ? "إجمالي الأصول" : "Total Assets", amount: totalAssets, section: "" },
      ...flattenTree(liabilityTree, isRTL ? "خصوم" : "Liabilities"),
      { code: "", name: isRTL ? "إجمالي الخصوم" : "Total Liabilities", amount: totalLiabilities, section: "" },
      ...flattenTree(equityTree, isRTL ? "حقوق ملكية" : "Equity"),
      { code: "", name: isRTL ? "صافي الدخل" : "Net Income", amount: netIncome, section: "" },
      { code: "", name: isRTL ? "إجمالي حقوق الملكية" : "Total Equity", amount: totalEquityWithIncome, section: "" },
    ];
    exportToExcel({
      filename: `BalanceSheet_${company?.name_en || company?.name || "Report"}_${today}`,
      title: isRTL ? "الميزانية العمومية" : "Balance Sheet",
      columns: [
        { header: isRTL ? "القسم" : "Section", key: "section", format: "text" },
        { header: isRTL ? "الرمز" : "Code", key: "code", format: "text" },
        { header: isRTL ? "البيان" : "Description", key: "name", format: "text" },
        { header: isRTL ? "المبلغ" : "Amount", key: "amount", format: "number" },
      ],
      rows: allRows,
    });
  };

  const renderNodes = (nodes: TreeNode[], colorClass: string): React.ReactNode =>
    nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.account.id);
      const hasChildren = node.children.length > 0;
      return (
        <div key={node.account.id}>
          <div
            className={`flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md transition-colors ${hasChildren ? "cursor-pointer font-semibold" : ""}`}
            style={{ paddingInlineStart: `${node.depth * 24 + 12}px` }}
            onClick={() => hasChildren && toggleNode(node.account.id)}
          >
            <div className="flex items-center gap-2">
              {hasChildren ? (isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <Chevron className="h-4 w-4 text-muted-foreground" />) : <span className="w-4" />}
              <span className="font-mono text-xs text-muted-foreground">{node.account.code}</span>
              <span className={hasChildren ? "" : "text-sm"}>{accountName(node.account)}</span>
            </div>
            <span className={`font-mono text-sm ${hasChildren ? colorClass : ""}`}>{formatCurrency(node.balance)}</span>
          </div>
          {hasChildren && isExpanded && renderNodes(node.children, colorClass)}
        </div>
      );
    });

  if (loading || isLoadingCompany) {
    return (<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}><BackArrow className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "الميزانية العمومية" : "Balance Sheet"}</h1>
            <p className="text-muted-foreground">{isRTL ? "الأصول والخصوم وحقوق الملكية" : "Assets, liabilities, and equity"}</p>
          </div>
        </div>
        <ReportActions
          printSettings={printSettings}
          company={companyInfo}
          document={printDoc}
          isRTL={isRTL}
          onExportExcel={handleExportExcel}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-blue-600">{isRTL ? "الأصول" : "Assets"}</CardTitle></CardHeader>
          <CardContent>
            {assetTree.length === 0 ? (<p className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد أصول" : "No assets"}</p>) : (<div className="space-y-0.5">{renderNodes(assetTree, "text-blue-600")}</div>)}
            <div className="flex justify-between items-center mt-4 pt-3 border-t font-bold text-blue-600">
              <span>{isRTL ? "إجمالي الأصول" : "Total Assets"}</span>
              <span className="font-mono">{formatCurrency(totalAssets)} {currency}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-red-600">{isRTL ? "الخصوم" : "Liabilities"}</CardTitle></CardHeader>
            <CardContent>
              {liabilityTree.length === 0 ? (<p className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد خصوم" : "No liabilities"}</p>) : (<div className="space-y-0.5">{renderNodes(liabilityTree, "text-red-600")}</div>)}
              <div className="flex justify-between items-center mt-4 pt-3 border-t font-bold text-red-600">
                <span>{isRTL ? "إجمالي الخصوم" : "Total Liabilities"}</span>
                <span className="font-mono">{formatCurrency(totalLiabilities)} {currency}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-green-600">{isRTL ? "حقوق الملكية" : "Equity"}</CardTitle></CardHeader>
            <CardContent>
              {equityTree.length === 0 && netIncome === 0 ? (
                <p className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد حقوق ملكية" : "No equity"}</p>
              ) : (
                <>
                  <div className="space-y-0.5">{renderNodes(equityTree, "text-green-600")}</div>
                  <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md mt-2 italic">
                    <div className="flex items-center gap-2">
                      <span className="w-4" />
                      <span className="text-sm">
                        {netIncome >= 0 ? (isRTL ? "صافي ربح الفترة (قائمة الدخل)" : "Net Profit (Income Statement)") : (isRTL ? "صافي خسارة الفترة (قائمة الدخل)" : "Net Loss (Income Statement)")}
                      </span>
                    </div>
                    <span className={`font-mono text-sm ${netIncome >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(Math.abs(netIncome))}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center mt-4 pt-3 border-t font-bold text-green-600">
                <span>{isRTL ? "إجمالي حقوق الملكية (شامل صافي الدخل)" : "Total Equity (incl. Net Income)"}</span>
                <span className="font-mono">{formatCurrency(totalEquityWithIncome)} {currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className={isBalanced ? "border-green-500" : "border-destructive"}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            {isBalanced ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
            <span className={`font-semibold ${isBalanced ? "text-green-600" : "text-destructive"}`}>
              {isBalanced ? (isRTL ? "الميزانية متوازنة ✓" : "Balance Sheet is balanced ✓") : (isRTL ? "الميزانية غير متوازنة ✗" : "Balance Sheet is NOT balanced ✗")}
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الأصول" : "Total Assets"}</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalAssets)} {currency}</p>
            </div>
            <div className="flex items-center justify-center text-2xl font-bold">=</div>
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "الخصوم + حقوق الملكية" : "Liabilities + Equity"}</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalLiabAndEquity)} {currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSheet;
