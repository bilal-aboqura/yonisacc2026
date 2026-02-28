import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, CreditCard, Landmark, Banknote, Receipt } from "lucide-react";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  name_en: string | null;
  code: string;
  account_id: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

interface Props {
  companyId: string;
}

const iconMap: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  bank_transfer: <Landmark className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  cheque: <Receipt className="h-4 w-4" />,
};

const PaymentMethodsSettings = ({ companyId }: Props) => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", name_en: "", code: "", account_id: "", is_active: true });

  // Fetch payment methods
  const { data: methods, isLoading } = useQuery({
    queryKey: ["payment-methods", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("payment_methods")
        .select("*")
        .eq("company_id", companyId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
    enabled: !!companyId,
  });

  // Fetch accounts (leaf accounts only for linking)
  const { data: accounts } = useQuery({
    queryKey: ["accounts-for-payment", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name, name_en, type")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .or("is_parent.is.null,is_parent.eq.false")
        .order("code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId,
        name: form.name,
        name_en: form.name_en || null,
        code: form.code,
        account_id: form.account_id || null,
        is_active: form.is_active,
      };

      if (editingMethod) {
        const { error } = await (supabase.from as any)("payment_methods")
          .update(payload)
          .eq("id", editingMethod.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("payment_methods")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods", companyId] });
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
      closeDialog();
    },
    onError: (err: any) => {
      if (err?.message?.includes("duplicate")) {
        toast.error(isRTL ? "الكود مستخدم بالفعل" : "Code already exists");
      } else {
        toast.error(isRTL ? "فشل في الحفظ" : "Failed to save");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods", companyId] });
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
    onError: () => {
      toast.error(isRTL ? "فشل في الحذف" : "Failed to delete");
    },
  });

  const openAdd = () => {
    setEditingMethod(null);
    setForm({ name: "", name_en: "", code: "", account_id: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditingMethod(m);
    setForm({
      name: m.name,
      name_en: m.name_en || "",
      code: m.code,
      account_id: m.account_id || "",
      is_active: m.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingMethod(null);
  };

  const getAccountLabel = (accountId: string | null) => {
    if (!accountId || !accounts) return isRTL ? "غير مربوط" : "Not linked";
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return "-";
    return `${acc.code} - ${isRTL ? acc.name : (acc.name_en || acc.name)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{isRTL ? "طرق الدفع" : "Payment Methods"}</CardTitle>
            <CardDescription>
              {isRTL ? "ربط طرق الدفع بحسابات دليل الحسابات" : "Link payment methods to chart of accounts"}
            </CardDescription>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {isRTL ? "إضافة" : "Add"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "طريقة الدفع" : "Payment Method"}</TableHead>
                <TableHead>{isRTL ? "الكود" : "Code"}</TableHead>
                <TableHead>{isRTL ? "الحساب المرتبط" : "Linked Account"}</TableHead>
                <TableHead className="text-center">{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(methods || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {isRTL ? "لا توجد طرق دفع" : "No payment methods"}
                  </TableCell>
                </TableRow>
              ) : (
                (methods || []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {iconMap[m.code] || <CreditCard className="h-4 w-4" />}
                        <span className="font-medium">{isRTL ? m.name : (m.name_en || m.name)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{m.code}</TableCell>
                    <TableCell>
                      <span className={m.account_id ? "text-foreground" : "text-muted-foreground text-sm"}>
                        {getAccountLabel(m.account_id)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {m.is_active ? (isRTL ? "فعال" : "Active") : (isRTL ? "معطل" : "Inactive")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(isRTL ? "هل تريد حذف طريقة الدفع؟" : "Delete this payment method?")) {
                              deleteMutation.mutate(m.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethod
                ? (isRTL ? "تعديل طريقة الدفع" : "Edit Payment Method")
                : (isRTL ? "إضافة طريقة دفع" : "Add Payment Method")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isRTL ? "نقدي" : "Cash"}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                <Input
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  placeholder="Cash"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الكود" : "Code"}</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="cash"
                dir="ltr"
                disabled={!!editingMethod}
              />
              <p className="text-xs text-muted-foreground">
                {isRTL ? "الكود يُستخدم داخلياً ولا يمكن تغييره بعد الإنشاء" : "Code is used internally and cannot be changed after creation"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الحساب المرتبط" : "Linked Account"}</Label>
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر حساب..." : "Select account..."} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? "بدون ربط" : "No link"}</SelectItem>
                  {(accounts || []).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {isRTL ? acc.name : (acc.name_en || acc.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>{isRTL ? "فعال" : "Active"}</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name || !form.code || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentMethodsSettings;
