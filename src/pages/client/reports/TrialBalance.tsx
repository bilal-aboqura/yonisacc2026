import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Download, Printer, Loader2, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccountNode {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
  is_parent: boolean;
  children: AccountNode[];
  // Leaf-level raw data
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  // Aggregated (for parents = sum of children, for leaves = own values)
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

  const [loading, setLoading] = useState(true);
  const [allAccounts, setAllAccounts] = useState<AccountNode[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!companyData) return;

      // Fetch ALL accounts (parents + leaves)
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, code, name, type, parent_id, is_parent, is_active")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .order("code");

      if (!accountsData || accountsData.length === 0) {
        setAllAccounts([]);
        setLoading(false);
        return;
      }

      // Identify leaf accounts (not parent)
      const leafAccounts = accountsData.filter(a => !a.is_parent);
      const leafIds = leafAccounts.map(a => a.id);

      // 1. Fetch opening balances for leaf accounts
      const { data: obData } = await supabase
        .from("opening_balances")
        .select("account_id, debit, credit")
        .eq("company_id", companyData.id);

      const openingMap = new Map<string, { debit: number; credit: number }>();
      (obData || []).forEach((ob: any) => {
        const existing = openingMap.get(ob.account_id) || { debit: 0, credit: 0 };
        openingMap.set(ob.account_id, {
          debit: existing.debit + (Number(ob.debit) || 0),
          credit: existing.credit + (Number(ob.credit) || 0),
        });
      });

      // 2. If dateFrom is set, add prior journal movements to opening balance
      if (dateFrom) {
        const { data: priorEntries } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("company_id", companyData.id)
          .eq("status", "posted")
          .lt("entry_date", dateFrom);

        if (priorEntries && priorEntries.length > 0) {
          const priorIds = priorEntries.map(e => e.id);
          for (let i = 0; i < priorIds.length; i += 100) {
            const chunk = priorIds.slice(i, i + 100);
            const { data: priorLines } = await supabase
              .from("journal_entry_lines")
              .select("account_id, debit, credit")
              .in("entry_id", chunk)
              .in("account_id", leafIds);

            (priorLines || []).forEach((line: any) => {
              const existing = openingMap.get(line.account_id) || { debit: 0, credit: 0 };
              openingMap.set(line.account_id, {
                debit: existing.debit + (Number(line.debit) || 0),
                credit: existing.credit + (Number(line.credit) || 0),
              });
            });
          }
        }
      }

      // 3. Fetch period movements
      let entriesQuery = supabase
        .from("journal_entries")
        .select("id")
        .eq("company_id", companyData.id)
        .eq("status", "posted");

      if (dateFrom) entriesQuery = entriesQuery.gte("entry_date", dateFrom);
      if (dateTo) entriesQuery = entriesQuery.lte("entry_date", dateTo);

      const { data: entries } = await entriesQuery;
      const entryIds = (entries || []).map(e => e.id);

      const movementMap = new Map<string, { debit: number; credit: number }>();

      if (entryIds.length > 0) {
        for (let i = 0; i < entryIds.length; i += 100) {
          const chunk = entryIds.slice(i, i + 100);
          const { data: lines } = await supabase
            .from("journal_entry_lines")
            .select("account_id, debit, credit")
            .in("entry_id", chunk)
            .in("account_id", leafIds);

          (lines || []).forEach((line: any) => {
            const existing = movementMap.get(line.account_id) || { debit: 0, credit: 0 };
            movementMap.set(line.account_id, {
              debit: existing.debit + (Number(line.debit) || 0),
              credit: existing.credit + (Number(line.credit) || 0),
            });
          });
        }
      }

      // 4. Build account nodes with leaf-level data
      const nodes: AccountNode[] = accountsData.map(account => {
        const opening = openingMap.get(account.id) || { debit: 0, credit: 0 };
        const movement = movementMap.get(account.id) || { debit: 0, credit: 0 };
        const openingNet = opening.debit - opening.credit;

        return {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          parent_id: account.parent_id,
          is_parent: !!account.is_parent,
          children: [],
          openingDebit: openingNet > 0 ? openingNet : 0,
          openingCredit: openingNet < 0 ? Math.abs(openingNet) : 0,
          movementDebit: movement.debit,
          movementCredit: movement.credit,
          // Will be computed after tree is built
          aggOpeningDebit: 0,
          aggOpeningCredit: 0,
          aggMovementDebit: 0,
          aggMovementCredit: 0,
          aggEndingDebit: 0,
          aggEndingCredit: 0,
        };
      });

      // 5. Build tree
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

      // 6. Recursive aggregation (bottom-up)
      const aggregate = (node: AccountNode) => {
        if (node.children.length === 0) {
          // Leaf: use own data
          node.aggOpeningDebit = node.openingDebit;
          node.aggOpeningCredit = node.openingCredit;
          node.aggMovementDebit = node.movementDebit;
          node.aggMovementCredit = node.movementCredit;
        } else {
          // Parent: sum children
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

      // 7. Flatten tree for display (with indentation level)
      setAllAccounts(roots);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Flatten tree for table display
  const flatRows = useMemo(() => {
    const result: { node: AccountNode; level: number }[] = [];
    const walk = (nodes: AccountNode[], level: number) => {
      nodes.forEach(node => {
        // Only include if has any balance
        const hasBalance = node.aggOpeningDebit > 0 || node.aggOpeningCredit > 0 || 
          node.aggMovementDebit > 0 || node.aggMovementCredit > 0;
        if (hasBalance) {
          result.push({ node, level });
          if (node.children.length > 0) {
            walk(node.children, level + 1);
          }
        }
      });
    };
    walk(allAccounts, 0);
    return result;
  }, [allAccounts]);

  const totals = useMemo(() => {
    // Only sum root-level accounts to avoid double counting
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
    const names: Record<string, string> = {
      asset: "أصول",
      liability: "خصوم",
      equity: "حقوق ملكية",
      revenue: "إيرادات",
      expense: "مصروفات",
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/reports")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ميزان المراجعة</h1>
            <p className="text-muted-foreground">أرصدة جميع الحسابات مع الحركات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="ps-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="ps-10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Status */}
      {flatRows.length > 0 && (
        isBalanced ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              ميزان المراجعة متوازن ✓
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              ميزان المراجعة غير متوازن - الفرق: {formatCurrency(Math.abs(totals.endingDebit - totals.endingCredit))} ر.س
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>ميزان المراجعة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="w-20 border-e">الرمز</TableHead>
                <TableHead rowSpan={2} className="border-e">اسم الحساب</TableHead>
                <TableHead rowSpan={2} className="w-20 border-e">النوع</TableHead>
                <TableHead colSpan={2} className="text-center border-e bg-blue-50/50 dark:bg-blue-950/20">الرصيد الافتتاحي</TableHead>
                <TableHead colSpan={2} className="text-center border-e bg-amber-50/50 dark:bg-amber-950/20">الحركات</TableHead>
                <TableHead colSpan={2} className="text-center bg-green-50/50 dark:bg-green-950/20">الرصيد الختامي</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-center w-28 bg-blue-50/50 dark:bg-blue-950/20">مدين</TableHead>
                <TableHead className="text-center w-28 border-e bg-blue-50/50 dark:bg-blue-950/20">دائن</TableHead>
                <TableHead className="text-center w-28 bg-amber-50/50 dark:bg-amber-950/20">مدين</TableHead>
                <TableHead className="text-center w-28 border-e bg-amber-50/50 dark:bg-amber-950/20">دائن</TableHead>
                <TableHead className="text-center w-28 bg-green-50/50 dark:bg-green-950/20">مدين</TableHead>
                <TableHead className="text-center w-28 bg-green-50/50 dark:bg-green-950/20">دائن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    لا توجد حسابات مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                flatRows.map(({ node, level }) => (
                  <TableRow 
                    key={node.id} 
                    className={node.is_parent ? "bg-muted/30 font-semibold" : ""}
                  >
                    <TableCell className="font-mono border-e">
                      <span style={{ paddingInlineStart: `${level * 16}px` }}>{node.code}</span>
                    </TableCell>
                    <TableCell className="border-e">
                      <span style={{ paddingInlineStart: `${level * 16}px` }}>{node.name}</span>
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
              {/* Totals */}
              <TableRow className="bg-muted/50 font-bold text-lg border-t-2">
                <TableCell colSpan={3} className="border-e">الإجمالي</TableCell>
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
