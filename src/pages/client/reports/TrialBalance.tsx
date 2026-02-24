import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRight, Download, Printer, Loader2, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";

interface AccountNode {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
  parent_id: string | null;
  is_parent: boolean;
  children: AccountNode[];
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  aggOpeningDebit: number;
  aggOpeningCredit: number;
  aggMovementDebit: number;
  aggMovementCredit: number;
  aggEndingDebit: number;
  aggEndingCredit: number;
}

const TrialBalance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("companies").select("id").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Single server-side call for trial balance
  const { data: tbData, isLoading: loading } = useQuery({
    queryKey: ["trial-balance", company?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await (supabase.rpc as any)("get_trial_balance", {
        p_company_id: company.id,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!company?.id,
  });

  // Build tree + aggregate from server data
  const allAccounts = useMemo(() => {
    if (!tbData?.accounts) return [];
    const rawAccounts = tbData.accounts as any[];

    const nodes: AccountNode[] = rawAccounts.map((a: any) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      name_en: a.name_en,
      type: a.type,
      parent_id: a.parent_id,
      is_parent: !!a.is_parent,
      children: [],
      openingDebit: Number(a.opening_debit) || 0,
      openingCredit: Number(a.opening_credit) || 0,
      movementDebit: Number(a.movement_debit) || 0,
      movementCredit: Number(a.movement_credit) || 0,
      aggOpeningDebit: 0, aggOpeningCredit: 0,
      aggMovementDebit: 0, aggMovementCredit: 0,
      aggEndingDebit: 0, aggEndingCredit: 0,
    }));

    const nodeMap = new Map<string, AccountNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const roots: AccountNode[] = [];
    nodes.forEach(n => {
      if (n.parent_id && nodeMap.has(n.parent_id)) {
        nodeMap.get(n.parent_id)!.children.push(n);
      } else {
        roots.push(n);
      }
    });

    const aggregate = (node: AccountNode) => {
      if (node.children.length === 0) {
        node.aggOpeningDebit = node.openingDebit;
        node.aggOpeningCredit = node.openingCredit;
        node.aggMovementDebit = node.movementDebit;
        node.aggMovementCredit = node.movementCredit;
      } else {
        node.children.forEach(child => aggregate(child));
        node.aggOpeningDebit = node.children.reduce((s, c) => s + c.aggOpeningDebit, 0);
        node.aggOpeningCredit = node.children.reduce((s, c) => s + c.aggOpeningCredit, 0);
        node.aggMovementDebit = node.children.reduce((s, c) => s + c.aggMovementDebit, 0);
        node.aggMovementCredit = node.children.reduce((s, c) => s + c.aggMovementCredit, 0);
      }
      const endingNet = (node.aggOpeningDebit - node.aggOpeningCredit) + (node.aggMovementDebit - node.aggMovementCredit);
      node.aggEndingDebit = endingNet > 0 ? endingNet : 0;
      node.aggEndingCredit = endingNet < 0 ? Math.abs(endingNet) : 0;
    };

    roots.forEach(r => aggregate(r));
    return roots;
  }, [tbData]);

  const flatRows = useMemo(() => {
    const result: { node: AccountNode; level: number }[] = [];
    const walk = (nodes: AccountNode[], level: number) => {
      nodes.forEach(node => {
        const hasBalance = node.aggOpeningDebit > 0 || node.aggOpeningCredit > 0 || node.aggMovementDebit > 0 || node.aggMovementCredit > 0;
        if (hasBalance) {
          result.push({ node, level });
          if (node.children.length > 0) walk(node.children, level + 1);
        }
      });
    };
    walk(allAccounts, 0);
    return result;
  }, [allAccounts]);

  const totals = useMemo(() => {
    return allAccounts.reduce(
      (acc, node) => ({
        openingDebit: acc.openingDebit + node.aggOpeningDebit,
        openingCredit: acc.openingCredit + node.aggOpeningCredit,
        movementDebit: acc.movementDebit + node.aggMovementDebit,
        movementCredit: acc.movementCredit + node.aggMovementCredit,
        endingDebit: acc.endingDebit + node.aggEndingDebit,
        endingCredit: acc.endingCredit + node.aggEndingCredit,
      }),
      { openingDebit: 0, openingCredit: 0, movementDebit: 0, movementCredit: 0, endingDebit: 0, endingCredit: 0 }
    );
  }, [allAccounts]);

  const isBalanced = Math.abs(totals.endingDebit - totals.endingCredit) < 0.01;

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "-";
    return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTypeName = (type: string) => {
    const names: Record<string, { ar: string; en: string }> = {
      asset: { ar: "أصول", en: "Assets" },
      liability: { ar: "خصوم", en: "Liabilities" },
      equity: { ar: "حقوق ملكية", en: "Equity" },
      revenue: { ar: "إيرادات", en: "Revenue" },
      expense: { ar: "مصروفات", en: "Expenses" },
    };
    return isRTL ? (names[type]?.ar || type) : (names[type]?.en || type);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "ميزان المراجعة" : "Trial Balance"}</h1>
            <p className="text-muted-foreground">{isRTL ? "أرصدة جميع الحسابات مع الحركات" : "All account balances with movements"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon"><Printer className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "من تاريخ" : "From Date"}</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="ps-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "إلى تاريخ" : "To Date"}</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="ps-10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {flatRows.length > 0 && (
        isBalanced ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {isRTL ? "ميزان المراجعة متوازن ✓" : "Trial Balance is balanced ✓"}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {isRTL ? `ميزان المراجعة غير متوازن - الفرق: ${formatCurrency(Math.abs(totals.endingDebit - totals.endingCredit))} ر.س` : `Trial Balance is unbalanced - Difference: ${formatCurrency(Math.abs(totals.endingDebit - totals.endingCredit))}`}
            </AlertDescription>
          </Alert>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "ميزان المراجعة" : "Trial Balance"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="w-20 border-e">{isRTL ? "الرمز" : "Code"}</TableHead>
                <TableHead rowSpan={2} className="border-e">{isRTL ? "اسم الحساب" : "Account Name"}</TableHead>
                <TableHead rowSpan={2} className="w-20 border-e">{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead colSpan={2} className="text-center border-e bg-blue-50/50 dark:bg-blue-950/20">{isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}</TableHead>
                <TableHead colSpan={2} className="text-center border-e bg-amber-50/50 dark:bg-amber-950/20">{isRTL ? "الحركات" : "Movements"}</TableHead>
                <TableHead colSpan={2} className="text-center bg-green-50/50 dark:bg-green-950/20">{isRTL ? "الرصيد الختامي" : "Ending Balance"}</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-center w-28 bg-blue-50/50 dark:bg-blue-950/20">{isRTL ? "مدين" : "Debit"}</TableHead>
                <TableHead className="text-center w-28 border-e bg-blue-50/50 dark:bg-blue-950/20">{isRTL ? "دائن" : "Credit"}</TableHead>
                <TableHead className="text-center w-28 bg-amber-50/50 dark:bg-amber-950/20">{isRTL ? "مدين" : "Debit"}</TableHead>
                <TableHead className="text-center w-28 border-e bg-amber-50/50 dark:bg-amber-950/20">{isRTL ? "دائن" : "Credit"}</TableHead>
                <TableHead className="text-center w-28 bg-green-50/50 dark:bg-green-950/20">{isRTL ? "مدين" : "Debit"}</TableHead>
                <TableHead className="text-center w-28 bg-green-50/50 dark:bg-green-950/20">{isRTL ? "دائن" : "Credit"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {isRTL ? "لا توجد حسابات مسجلة" : "No accounts found"}
                  </TableCell>
                </TableRow>
              ) : (
                flatRows.map(({ node, level }) => (
                  <TableRow key={node.id} className={node.is_parent ? "bg-muted/30 font-semibold" : ""}>
                    <TableCell className="font-mono border-e">
                      <span style={{ paddingInlineStart: `${level * 16}px` }}>{node.code}</span>
                    </TableCell>
                    <TableCell className="border-e">
                      <span style={{ paddingInlineStart: `${level * 16}px` }}>{isRTL ? node.name : (node.name_en || node.name)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground border-e">{getTypeName(node.type)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(node.aggOpeningDebit)}</TableCell>
                    <TableCell className="text-center border-e">{formatCurrency(node.aggOpeningCredit)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(node.aggMovementDebit)}</TableCell>
                    <TableCell className="text-center border-e">{formatCurrency(node.aggMovementCredit)}</TableCell>
                    <TableCell className="text-center font-medium">{formatCurrency(node.aggEndingDebit)}</TableCell>
                    <TableCell className="text-center font-medium">{formatCurrency(node.aggEndingCredit)}</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/50 font-bold text-lg border-t-2">
                <TableCell colSpan={3} className="border-e">{isRTL ? "الإجمالي" : "Total"}</TableCell>
                <TableCell className="text-center">{formatCurrency(totals.openingDebit)}</TableCell>
                <TableCell className="text-center border-e">{formatCurrency(totals.openingCredit)}</TableCell>
                <TableCell className="text-center">{formatCurrency(totals.movementDebit)}</TableCell>
                <TableCell className="text-center border-e">{formatCurrency(totals.movementCredit)}</TableCell>
                <TableCell className="text-center">{formatCurrency(totals.endingDebit)}</TableCell>
                <TableCell className="text-center">{formatCurrency(totals.endingCredit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialBalance;
