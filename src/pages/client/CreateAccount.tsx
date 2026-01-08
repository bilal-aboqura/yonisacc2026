import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Save, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ParentAccount {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  type: string;
}

const accountTypes = [
  { value: "asset", label: "أصول", labelEn: "Assets" },
  { value: "liability", label: "خصوم", labelEn: "Liabilities" },
  { value: "equity", label: "حقوق ملكية", labelEn: "Equity" },
  { value: "revenue", label: "إيرادات", labelEn: "Revenue" },
  { value: "expense", label: "مصروفات", labelEn: "Expenses" },
];

const CreateAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [accountType, setAccountType] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [isParent, setIsParent] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [filteredParents, setFilteredParents] = useState<ParentAccount[]>([]);

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  useEffect(() => {
    // Filter parent accounts by selected type
    if (accountType) {
      setFilteredParents(parentAccounts.filter((p) => p.type === accountType));
    } else {
      setFilteredParents([]);
    }
    setParentId("");
  }, [accountType, parentAccounts]);

  const fetchInitialData = async () => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (companyError) throw companyError;
      setCompanyId(companyData.id);

      // Fetch parent accounts
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, code, name, name_en, type")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .eq("is_parent", true)
        .order("code");

      setParentAccounts(accountsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;

    if (!code.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز الحساب",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الحساب",
        variant: "destructive",
      });
      return;
    }

    if (!accountType) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار نوع الحساب",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Check for duplicate code
      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("code", code.trim())
        .single();

      if (existingAccount) {
        toast({
          title: "خطأ",
          description: "رمز الحساب موجود مسبقاً",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("accounts").insert({
        company_id: companyId,
        code: code.trim(),
        name: name.trim(),
        name_en: nameEn.trim() || null,
        type: accountType,
        parent_id: parentId || null,
        is_parent: isParent,
        balance: openingBalance,
        is_active: isActive,
      });

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم إضافة الحساب بنجاح",
      });

      navigate("/client/accounts");
    } catch (error: any) {
      console.error("Error saving account:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ الحساب",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rtl max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/accounts")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">حساب جديد</h1>
            <p className="text-muted-foreground">إضافة حساب جديد لدليل الحسابات</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          <Save className="h-4 w-4 ml-2" />
          حفظ الحساب
        </Button>
      </div>

      {/* Account Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            بيانات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رمز الحساب *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: 1101"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>نوع الحساب *</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الحساب (عربي) *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم الحساب بالعربي"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الحساب (إنجليزي)</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Account name in English"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الحساب الرئيسي</Label>
            <Select 
              value={parentId || "__none__"} 
              onValueChange={(v) => setParentId(v === "__none__" ? "" : v)} 
              disabled={!accountType}
            >
              <SelectTrigger>
                <SelectValue placeholder={accountType ? "اختر الحساب الرئيسي (اختياري)" : "اختر نوع الحساب أولاً"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون حساب رئيسي</SelectItem>
                {filteredParents.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              اختر الحساب الرئيسي إذا كان هذا حساباً فرعياً
            </p>
          </div>

          <div className="space-y-2">
            <Label>الرصيد الافتتاحي</Label>
            <Input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">حساب رئيسي (تجميعي)</Label>
              <p className="text-sm text-muted-foreground">
                تفعيل هذا الخيار إذا كان الحساب يحتوي على حسابات فرعية
              </p>
            </div>
            <Switch checked={isParent} onCheckedChange={setIsParent} />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">حساب نشط</Label>
              <p className="text-sm text-muted-foreground">
                الحسابات غير النشطة لن تظهر في القوائم
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAccount;
