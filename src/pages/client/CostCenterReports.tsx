import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Loader2, TrendingUp, TrendingDown } from "lucide-react";

const CostCenterReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const [selectedCCId, setSelectedCCId] = useState("all");
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers").select("*").eq("company_id", companyId!).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch accounts with cost centers
  const { data: accounts = [] } = useQuery({
    queryKey: ["cc-accounts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts").select("id, name, name_en, code, cost_center_id")
        .eq("company_id", companyId!).not("cost_center_id", "is", null);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch journal entry lines for cost center accounts
  const { data: journalLines = [], isLoading } = useQuery({
    queryKey: ["cc-journal-lines", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const accountIds = accounts.map((a) => a.id);
      if (accountIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("journal_entry_lines")
        .select("account_id, debit, credit, description, journal_entries!inner(entry_date, status, company_id)")
        .in("account_id", accountIds)
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", dateFrom)
        .lte("journal_entries.entry_date", dateTo);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && accounts.length > 0,
  });

  // Aggregate by cost center
  const report = useMemo(() => {
    const ccMap: Record<string, { name: string; nameEn: string; totalDebit: number; totalCredit: number; details: any[] }> = {};

    costCenters.forEach((cc: any) => {
      ccMap[cc.id] = { name: cc.name, nameEn: cc.name_en || cc.name, totalDebit: 0, totalCredit: 0, details: [] };
    });

    journalLines.forEach((line: any) => {
      const account = accounts.find((a) => a.id === line.account_id);
      if (!account || !account.cost_center_id) return;
      if (selectedCCId !== "all" && account.cost_center_id !== selectedCCId) return;

      const cc = ccMap[account.cost_center_id];
      if (cc) {
        cc.totalDebit += line.debit || 0;
        cc.totalCredit += line.credit || 0;
        cc.details.push({
          accountCode: account.code,
          accountName: isRTL ? account.name : (account.name_en || account.name),
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
          date: line.journal_entries?.entry_date,
        });
      }
    });

    return Object.entries(ccMap)
      .filter(([id]) => selectedCCId === "all" || id === selectedCCId)
      .map(([id, data]) => ({ id, ...data, net: data.totalDebit - data.totalCredit }));
  }, [costCenters, accounts, journalLines, selectedCCId, isRTL]);

  const grandTotalDebit = report.reduce((s, r) => s + r.totalDebit, 0);
  const grandTotalCredit = report.reduce((s, r) => s + r.totalCredit, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? "تقارير مراكز التكلفة" : "Cost Center Reports"}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label>{isRTL ? "مركز التكلفة" : "Cost Center"}</Label>
          <Select value={selectedCCId} onValueChange={setSelectedCCId}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع المراكز" : "All Centers"}</SelectItem>
              {costCenters.map((cc: any) => (
                <SelectItem key={cc.id} value={cc.id}>{cc.code} - {isRTL ? cc.name : (cc.name_en || cc.name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>{isRTL ? "من" : "From"}</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" /></div>
        <div className="space-y-1"><Label>{isRTL ? "إلى" : "To"}</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" /></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "عدد المراكز" : "Centers"}</p>
          <p className="text-2xl font-bold">{report.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المدين" : "Total Debit"}</p>
          <p className="text-2xl font-bold flex items-center gap-1"><TrendingUp className="h-4 w-4 text-emerald-600" />{grandTotalDebit.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الدائن" : "Total Credit"}</p>
          <p className="text-2xl font-bold flex items-center gap-1"><TrendingDown className="h-4 w-4 text-red-600" />{grandTotalCredit.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "صافي" : "Net"}</p>
          <p className={`text-2xl font-bold ${grandTotalDebit - grandTotalCredit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {(grandTotalDebit - grandTotalCredit).toLocaleString()}
          </p>
        </CardContent></Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? "تقرير مراكز التكلفة" : "Cost Center Report"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          report.length === 0 ? <div className="text-center py-12 text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data"}</div> :
          <div className="space-y-6">
            {report.map((cc) => (
              <div key={cc.id} className="space-y-2">
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <h3 className="font-semibold">{isRTL ? cc.name : cc.nameEn}</h3>
                  <div className="flex gap-4 text-sm">
                    <span>{isRTL ? "مدين:" : "Dr:"} <strong>{cc.totalDebit.toLocaleString()}</strong></span>
                    <span>{isRTL ? "دائن:" : "Cr:"} <strong>{cc.totalCredit.toLocaleString()}</strong></span>
                    <span className={cc.net >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {isRTL ? "صافي:" : "Net:"} <strong>{cc.net.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
                {cc.details.length > 0 && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isRTL ? "الحساب" : "Account"}</TableHead>
                      <TableHead>{isRTL ? "الوصف" : "Description"}</TableHead>
                      <TableHead>{isRTL ? "مدين" : "Debit"}</TableHead>
                      <TableHead>{isRTL ? "دائن" : "Credit"}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {cc.details.map((d: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{d.date}</TableCell>
                          <TableCell>{d.accountCode} - {d.accountName}</TableCell>
                          <TableCell>{d.description || "—"}</TableCell>
                          <TableCell>{d.debit > 0 ? d.debit.toLocaleString() : "—"}</TableCell>
                          <TableCell>{d.credit > 0 ? d.credit.toLocaleString() : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostCenterReports;
