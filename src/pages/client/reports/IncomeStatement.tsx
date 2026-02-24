import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Printer, Loader2, TrendingUp, TrendingDown, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import useTenantIsolation from "@/hooks/useTenantIsolation";
import { toast } from "@/hooks/use-toast";

interface RawAccount {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  parent_id: string | null;
  is_parent: boolean | null;
  is_active: boolean | null;
  global_account_id: string | null;
}

interface TreeNode {
  account: RawAccount;
  balance: number;
  children: TreeNode[];
  depth: number;
}

const IncomeStatement = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { companyId, isLoadingCompany } = useTenantIsolation();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [accounts, setAccounts] = useState<RawAccount[]>([]);
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (companyId) fetchData();
  }, [companyId, period]);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [accountsRes, balanceRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, code, name, name_en, type, parent_id, is_parent, is_active, global_account_id")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .in("type", ["revenue", "expense"])
          .order("code"),
        (supabase.rpc as any)("get_account_balances", { p_company_id: companyId }),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (balanceRes.error) throw balanceRes.error;

      setAccounts(accountsRes.data || []);

      const bMap = new Map<string, number>();
      if (balanceRes.data && typeof balanceRes.data === "object") {
        Object.entries(balanceRes.data).forEach(([id, bal]) => {
          bMap.set(id, Number(bal) || 0);
        });
      }
      setBalanceMap(bMap);

      // Auto-expand root nodes
      const rootIds = new Set<string>();
      (accountsRes.data || []).forEach((a: RawAccount) => {
        if (!a.parent_id && a.is_parent) rootIds.add(a.id);
      });
      setExpandedNodes(rootIds);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "حدث خطأ في تحميل البيانات" : "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (items: RawAccount[], parentId: string | null, depth: number): TreeNode[] => {
    return items
      .filter((a) => a.parent_id === parentId)
      .map((a) => {
        const children = buildTree(items, a.id, depth + 1);
        const leafBalance = Math.abs(balanceMap.get(a.id) || 0);
        const childrenSum = children.reduce((s, c) => s + c.balance, 0);
        const balance = children.length > 0 ? childrenSum : leafBalance;
        return { account: a, balance, children, depth };
      })
      .filter((n) => n.balance !== 0 || n.children.length > 0);
  };

  const revenueTree = useMemo(() => buildTree(accounts.filter((a) => a.type === "revenue"), null, 0), [accounts, balanceMap]);
  const expenseTree = useMemo(() => buildTree(accounts.filter((a) => a.type === "expense"), null, 0), [accounts, balanceMap]);

  const sumTree = (nodes: TreeNode[]): number => nodes.reduce((s, n) => s + n.balance, 0);
  const totalRevenue = sumTree(revenueTree);
  const totalExpenses = sumTree(expenseTree);
  const netIncome = totalRevenue - totalExpenses;

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currency = isRTL ? "ر.س" : "SAR";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const accountName = (acc: RawAccount) => (isRTL ? acc.name : acc.name_en || acc.name);

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
              {hasChildren ? (
                isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <Chevron className="h-4 w-4 text-muted-foreground" />
              ) : (
                <span className="w-4" />
              )}
              <span className="font-mono text-xs text-muted-foreground">{node.account.code}</span>
              <span className={hasChildren ? "" : "text-sm"}>{accountName(node.account)}</span>
            </div>
            <span className={`font-mono text-sm ${hasChildren ? colorClass : ""}`}>
              {formatCurrency(node.balance)}
            </span>
          </div>
          {hasChildren && isExpanded && renderNodes(node.children, colorClass)}
        </div>
      );
    });

  if (loading || isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <BackArrow className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "قائمة الدخل" : "Income Statement"}</h1>
            <p className="text-muted-foreground">{isRTL ? "الإيرادات والمصروفات وصافي الربح" : "Revenue, expenses, and net profit"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{isRTL ? "هذا الشهر" : "This Month"}</SelectItem>
              <SelectItem value="quarter">{isRTL ? "هذا الربع" : "This Quarter"}</SelectItem>
              <SelectItem value="year">{isRTL ? "هذه السنة" : "This Year"}</SelectItem>
              <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)} {currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المصروفات" : "Total Expenses"}</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)} {currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={netIncome >= 0 ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {netIncome >= 0 ? <TrendingUp className="h-8 w-8 text-primary" /> : <TrendingDown className="h-8 w-8 text-destructive" />}
              <div>
                <p className="text-sm text-muted-foreground">
                  {netIncome >= 0 ? (isRTL ? "صافي الربح" : "Net Profit") : (isRTL ? "صافي الخسارة" : "Net Loss")}
                </p>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(Math.abs(netIncome))} {currency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">{isRTL ? "الإيرادات" : "Revenue"}</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueTree.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد إيرادات مسجلة" : "No revenue recorded"}</p>
          ) : (
            <div className="space-y-0.5">{renderNodes(revenueTree, "text-green-600")}</div>
          )}
          <div className="flex justify-between items-center mt-4 pt-3 border-t font-bold text-green-600">
            <span>{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</span>
            <span className="font-mono">{formatCurrency(totalRevenue)} {currency}</span>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">{isRTL ? "المصروفات" : "Expenses"}</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseTree.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{isRTL ? "لا توجد مصروفات مسجلة" : "No expenses recorded"}</p>
          ) : (
            <div className="space-y-0.5">{renderNodes(expenseTree, "text-red-600")}</div>
          )}
          <div className="flex justify-between items-center mt-4 pt-3 border-t font-bold text-red-600">
            <span>{isRTL ? "إجمالي المصروفات" : "Total Expenses"}</span>
            <span className="font-mono">{formatCurrency(totalExpenses)} {currency}</span>
          </div>
        </CardContent>
      </Card>

      {/* Net Income */}
      <Card className={netIncome >= 0 ? "border-primary" : "border-destructive"}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>{netIncome >= 0 ? (isRTL ? "صافي الربح" : "Net Profit") : (isRTL ? "صافي الخسارة" : "Net Loss")}</span>
            <span className={netIncome >= 0 ? "text-primary" : "text-destructive"}>
              {formatCurrency(Math.abs(netIncome))} {currency}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeStatement;
