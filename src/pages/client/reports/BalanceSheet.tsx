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
import { ArrowRight, Download, Printer, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

const BalanceSheet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AccountBalance[]>([]);
  const [liabilities, setLiabilities] = useState<AccountBalance[]>([]);
  const [equity, setEquity] = useState<AccountBalance[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (!companyData) return;

      // Fetch assets
      const { data: assetsData } = await supabase
        .from("accounts")
        .select("id, code, name, type, balance")
        .eq("company_id", companyData.id)
        .eq("type", "asset")
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setAssets(assetsData || []);

      // Fetch liabilities
      const { data: liabilitiesData } = await supabase
        .from("accounts")
        .select("id, code, name, type, balance")
        .eq("company_id", companyData.id)
        .eq("type", "liability")
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setLiabilities(liabilitiesData || []);

      // Fetch equity
      const { data: equityData } = await supabase
        .from("accounts")
        .select("id, code, name, type, balance")
        .eq("company_id", companyData.id)
        .eq("type", "equity")
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");

      setEquity(equityData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = assets.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  const totalEquity = equity.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            <h1 className="text-2xl font-bold">الميزانية العمومية</h1>
            <p className="text-muted-foreground">الأصول والخصوم وحقوق الملكية</p>
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">الأصول</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">الرمز</TableHead>
                  <TableHead>الحساب</TableHead>
                  <TableHead className="text-left w-32">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      لا توجد أصول
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell className="text-left">{formatCurrency(account.balance || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-blue-500/10 font-bold">
                  <TableCell colSpan={2}>إجمالي الأصول</TableCell>
                  <TableCell className="text-left">{formatCurrency(totalAssets)} ر.س</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <div className="space-y-6">
          {/* Liabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">الخصوم</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">الرمز</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead className="text-left w-32">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liabilities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        لا توجد خصوم
                      </TableCell>
                    </TableRow>
                  ) : (
                    liabilities.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono text-sm">{account.code}</TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-left">{formatCurrency(Math.abs(account.balance || 0))}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-red-500/10 font-bold">
                    <TableCell colSpan={2}>إجمالي الخصوم</TableCell>
                    <TableCell className="text-left">{formatCurrency(totalLiabilities)} ر.س</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">حقوق الملكية</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">الرمز</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead className="text-left w-32">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        لا توجد حقوق ملكية
                      </TableCell>
                    </TableRow>
                  ) : (
                    equity.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono text-sm">{account.code}</TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-left">{formatCurrency(Math.abs(account.balance || 0))}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-green-500/10 font-bold">
                    <TableCell colSpan={2}>إجمالي حقوق الملكية</TableCell>
                    <TableCell className="text-left">{formatCurrency(totalEquity)} ر.س</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Balance Check */}
      <Card className="border-primary">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الأصول</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalAssets)} ر.س</p>
            </div>
            <div className="flex items-center justify-center text-2xl font-bold">=</div>
            <div>
              <p className="text-sm text-muted-foreground">الخصوم + حقوق الملكية</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalLiabilities + totalEquity)} ر.س</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSheet;
