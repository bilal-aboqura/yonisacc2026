import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Download, Printer, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  type: string;
  amount: number;
  description: string | null;
}

const CashFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, period]);

  const fetchData = async () => {
    try {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (!companyData) return;

      const { data: transactionsData } = await supabase
        .from("treasury_transactions")
        .select("id, transaction_number, transaction_date, type, amount, description")
        .eq("company_id", companyData.id)
        .order("transaction_date", { ascending: false });

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inflows = transactions.filter((t) => t.type === "deposit" || t.type === "receipt");
  const outflows = transactions.filter((t) => t.type === "withdrawal" || t.type === "payment");

  const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);
  const netCashFlow = totalInflow - totalOutflow;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: "إيداع",
      withdrawal: "سحب",
      receipt: "سند قبض",
      payment: "سند صرف",
    };
    return labels[type] || type;
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
            <h1 className="text-2xl font-bold">قائمة التدفقات النقدية</h1>
            <p className="text-muted-foreground">حركة النقدية الداخلة والخارجة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="quarter">هذا الربع</SelectItem>
              <SelectItem value="year">هذه السنة</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">التدفقات الداخلة</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">التدفقات الخارجة</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflow)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={netCashFlow >= 0 ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {netCashFlow >= 0 ? (
                <ArrowUpRight className="h-8 w-8 text-primary" />
              ) : (
                <ArrowDownRight className="h-8 w-8 text-destructive" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">صافي التدفق النقدي</p>
                <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(Math.abs(netCashFlow))} ر.س
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inflows */}
      <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-green-600 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            التدفقات النقدية الداخلة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>البيان</TableHead>
                <TableHead className="text-left">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    لا توجد تدفقات داخلة
                  </TableCell>
                </TableRow>
              ) : (
                inflows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono">{t.transaction_number}</TableCell>
                    <TableCell>{new Date(t.transaction_date).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>{getTypeLabel(t.type)}</TableCell>
                    <TableCell>{t.description || "-"}</TableCell>
                    <TableCell className="text-left text-green-600 font-medium">
                      +{formatCurrency(t.amount)} ر.س
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-green-500/10 font-bold">
                <TableCell colSpan={4}>الإجمالي</TableCell>
                <TableCell className="text-left">{formatCurrency(totalInflow)} ر.س</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Outflows */}
      <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5" />
            التدفقات النقدية الخارجة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>البيان</TableHead>
                <TableHead className="text-left">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    لا توجد تدفقات خارجة
                  </TableCell>
                </TableRow>
              ) : (
                outflows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono">{t.transaction_number}</TableCell>
                    <TableCell>{new Date(t.transaction_date).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>{getTypeLabel(t.type)}</TableCell>
                    <TableCell>{t.description || "-"}</TableCell>
                    <TableCell className="text-left text-red-600 font-medium">
                      -{formatCurrency(t.amount)} ر.س
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-red-500/10 font-bold">
                <TableCell colSpan={4}>الإجمالي</TableCell>
                <TableCell className="text-left">{formatCurrency(totalOutflow)} ر.س</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlow;
