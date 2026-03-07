import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Users, BarChart3 } from "lucide-react";
import BranchSelector from "@/components/client/BranchSelector";

const COLORS = ["hsl(185, 70%, 32%)", "hsl(38, 90%, 55%)", "hsl(150, 60%, 40%)", "hsl(0, 75%, 55%)", "hsl(199, 89%, 48%)"];

const POSReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: transactions } = useQuery({
    queryKey: ["pos-report-transactions", companyId, selectedBranch, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("pos_transactions" as any).select("*").eq("company_id", companyId!).eq("status", "completed");
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
      const { data } = await query.order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const totalSales = (transactions || []).reduce((s: number, t: any) => s + (t.total || 0), 0);
  const totalTransactions = (transactions || []).length;
  const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  // Payment method breakdown
  const paymentBreakdown = (transactions || []).reduce((acc: any, t: any) => {
    const method = t.payment_method || "cash";
    acc[method] = (acc[method] || 0) + (t.total || 0);
    return acc;
  }, {});
  const paymentData = Object.entries(paymentBreakdown).map(([name, value]) => ({ name, value }));

  // Daily sales
  const dailySales = (transactions || []).reduce((acc: any, t: any) => {
    const day = t.created_at?.split("T")[0] || "";
    acc[day] = (acc[day] || 0) + (t.total || 0);
    return acc;
  }, {});
  const dailyData = Object.entries(dailySales).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "تقارير نقاط البيع" : "POS Reports"}</h1>
        <p className="text-sm text-muted-foreground">{isRTL ? "تحليل أداء المبيعات" : "Sales performance analytics"}</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <BranchSelector companyId={companyId!} value={selectedBranch} onChange={setSelectedBranch} />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[180px]" placeholder={isRTL ? "من تاريخ" : "From"} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[180px]" placeholder={isRTL ? "إلى تاريخ" : "To"} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10"><DollarSign className="h-6 w-6 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المبيعات" : "Total Sales"}</p><p className="text-2xl font-bold">{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 rounded-full bg-accent/10"><ShoppingCart className="h-6 w-6 text-accent" /></div>
          <div><p className="text-sm text-muted-foreground">{isRTL ? "عدد العمليات" : "Transactions"}</p><p className="text-2xl font-bold">{totalTransactions}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 rounded-full bg-success/10"><TrendingUp className="h-6 w-6 text-success" /></div>
          <div><p className="text-sm text-muted-foreground">{isRTL ? "متوسط العملية" : "Avg. Transaction"}</p><p className="text-2xl font-bold">{avgTransaction.toFixed(2)}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="daily" dir={isRTL ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="daily">{isRTL ? "المبيعات اليومية" : "Daily Sales"}</TabsTrigger>
          <TabsTrigger value="payment">{isRTL ? "طرق الدفع" : "Payment Methods"}</TabsTrigger>
          <TabsTrigger value="transactions">{isRTL ? "العمليات" : "Transactions"}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader><CardTitle>{isRTL ? "المبيعات اليومية" : "Daily Sales"}</CardTitle></CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(185, 70%, 32%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{isRTL ? "لا توجد بيانات" : "No data available"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader><CardTitle>{isRTL ? "توزيع طرق الدفع" : "Payment Method Distribution"}</CardTitle></CardHeader>
            <CardContent>
              {paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-16 text-center text-muted-foreground">{isRTL ? "لا توجد بيانات" : "No data available"}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isRTL ? "الدفع" : "Payment"}</TableHead>
                  <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions || []).slice(0, 50).map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.transaction_number}</TableCell>
                    <TableCell className="text-xs">{new Date(tx.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{tx.order_type}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{tx.payment_method}</Badge></TableCell>
                    <TableCell className="font-medium">{tx.total?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(transactions || []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">{isRTL ? "لا توجد عمليات" : "No transactions"}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default POSReports;
