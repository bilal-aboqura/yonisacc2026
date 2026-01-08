import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ChevronDown, ChevronRight, ClipboardList, Folder, FileText } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  balance: number;
  children?: Account[];
}

const ClientAccounts = () => {
  const { isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);

  // Sample chart of accounts structure
  const accounts: Account[] = [
    {
      id: "1",
      code: "1",
      name: "الأصول",
      nameEn: "Assets",
      type: "asset",
      balance: 0,
      children: [
        {
          id: "11",
          code: "11",
          name: "الأصول المتداولة",
          nameEn: "Current Assets",
          type: "asset",
          balance: 0,
          children: [
            { id: "111", code: "111", name: "النقدية والبنوك", nameEn: "Cash & Banks", type: "asset", balance: 0 },
            { id: "112", code: "112", name: "العملاء", nameEn: "Accounts Receivable", type: "asset", balance: 0 },
            { id: "113", code: "113", name: "المخزون", nameEn: "Inventory", type: "asset", balance: 0 },
          ],
        },
        {
          id: "12",
          code: "12",
          name: "الأصول الثابتة",
          nameEn: "Fixed Assets",
          type: "asset",
          balance: 0,
        },
      ],
    },
    {
      id: "2",
      code: "2",
      name: "الخصوم",
      nameEn: "Liabilities",
      type: "liability",
      balance: 0,
      children: [
        { id: "21", code: "21", name: "الموردين", nameEn: "Accounts Payable", type: "liability", balance: 0 },
        { id: "22", code: "22", name: "القروض", nameEn: "Loans", type: "liability", balance: 0 },
      ],
    },
    {
      id: "3",
      code: "3",
      name: "حقوق الملكية",
      nameEn: "Equity",
      type: "equity",
      balance: 0,
      children: [
        { id: "31", code: "31", name: "رأس المال", nameEn: "Capital", type: "equity", balance: 0 },
        { id: "32", code: "32", name: "الأرباح المحتجزة", nameEn: "Retained Earnings", type: "equity", balance: 0 },
      ],
    },
    {
      id: "4",
      code: "4",
      name: "الإيرادات",
      nameEn: "Revenue",
      type: "revenue",
      balance: 0,
      children: [
        { id: "41", code: "41", name: "إيرادات المبيعات", nameEn: "Sales Revenue", type: "revenue", balance: 0 },
        { id: "42", code: "42", name: "إيرادات أخرى", nameEn: "Other Revenue", type: "revenue", balance: 0 },
      ],
    },
    {
      id: "5",
      code: "5",
      name: "المصروفات",
      nameEn: "Expenses",
      type: "expense",
      balance: 0,
      children: [
        { id: "51", code: "51", name: "تكلفة المبيعات", nameEn: "Cost of Sales", type: "expense", balance: 0 },
        { id: "52", code: "52", name: "المصروفات الإدارية", nameEn: "Admin Expenses", type: "expense", balance: 0 },
        { id: "53", code: "53", name: "مصروفات التسويق", nameEn: "Marketing Expenses", type: "expense", balance: 0 },
      ],
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getTypeColor = (type: Account["type"]) => {
    switch (type) {
      case "asset":
        return "bg-blue-500/10 text-blue-500";
      case "liability":
        return "bg-red-500/10 text-red-500";
      case "equity":
        return "bg-green-500/10 text-green-500";
      case "revenue":
        return "bg-emerald-500/10 text-emerald-500";
      case "expense":
        return "bg-orange-500/10 text-orange-500";
    }
  };

  const getTypeName = (type: Account["type"]) => {
    const names = {
      asset: { ar: "أصول", en: "Assets" },
      liability: { ar: "خصوم", en: "Liabilities" },
      equity: { ar: "ملكية", en: "Equity" },
      revenue: { ar: "إيرادات", en: "Revenue" },
      expense: { ar: "مصروفات", en: "Expenses" },
    };
    return isRTL ? names[type].ar : names[type].en;
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.includes(account.id);

    return (
      <div key={account.id}>
        <div
          className={`flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors`}
          style={{ paddingInlineStart: `${level * 24 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(account.id)}
        >
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                isRTL ? <ChevronRight className="h-4 w-4 rotate-180" /> : <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6 flex justify-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
          <span className="font-mono text-sm text-muted-foreground w-16">{account.code}</span>
          
          <div className="flex-1">
            <span className="font-medium">{isRTL ? account.name : account.nameEn}</span>
          </div>

          <Badge variant="secondary" className={getTypeColor(account.type)}>
            {getTypeName(account.type)}
          </Badge>

          <span className="font-mono text-sm w-24 text-end">
            {account.balance.toLocaleString()} ر.س
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {account.children!.map((child) => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "دليل الحسابات" : "Chart of Accounts"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "هيكل الحسابات المحاسبية للشركة" : "Company's accounting structure"}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {isRTL ? "حساب جديد" : "New Account"}
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم أو رقم الحساب..." : "Search by name or account number..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isRTL ? "شجرة الحسابات" : "Accounts Tree"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="divide-y">
            {accounts.map((account) => renderAccount(account))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAccounts;
