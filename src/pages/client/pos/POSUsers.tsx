import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, X, Save, Users, Edit, Trash2 } from "lucide-react";

interface UserForm {
  email: string; password: string; display_name: string;
  branch_id: string; role: string;
}

const emptyForm: UserForm = { email: "", password: "", display_name: "", branch_id: "", role: "cashier" };

const POSUsers = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const { data: branches } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: posUsers } = useQuery({
    queryKey: ["pos-users", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("pos_users" as any).select("*, branches!pos_users_branch_id_fkey(name, name_en)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        // Update existing POS user (no auth changes)
        const { error } = await supabase.from("pos_users" as any).update({
          display_name: form.display_name,
          branch_id: form.branch_id,
          role: form.role,
        } as any).eq("id", editing.id);
        if (error) throw error;
        return;
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
      if (!passwordRegex.test(form.password)) {
        throw new Error(isRTL ? "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل مع حروف كبيرة وصغيرة وأرقام ورموز" : "Password must be at least 8 chars with upper, lower, number, and special character");
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Add to company_members
      const { error: memberError } = await supabase.from("company_members").insert({
        company_id: companyId,
        user_id: authData.user.id,
        role: "client" as any,
        is_active: true,
        joined_at: new Date().toISOString(),
      } as any);
      if (memberError) throw memberError;

      // Add to pos_users
      const { error: posError } = await supabase.from("pos_users" as any).insert({
        company_id: companyId,
        user_id: authData.user.id,
        branch_id: form.branch_id,
        role: form.role,
        display_name: form.display_name,
      } as any);
      if (posError) throw posError;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setShowForm(false); setEditing(null); setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["pos-users"] });
    },
    onError: (e: any) => toast.error(e?.message || (isRTL ? "خطأ" : "Error")),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("pos_users" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_users" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? "تم الحذف" : "Deleted"); queryClient.invalidateQueries({ queryKey: ["pos-users"] }); },
  });

  const roleLabels: Record<string, { ar: string; en: string }> = {
    cashier: { ar: "كاشير", en: "Cashier" },
    branch_manager: { ar: "مدير فرع", en: "Branch Manager" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "مستخدمو نقاط البيع" : "POS Users"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إدارة مستخدمي نقاط البيع وأدوارهم" : "Manage POS users and their roles"}</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>
            <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة مستخدم" : "Add User"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editing ? (isRTL ? "تعديل مستخدم" : "Edit User") : (isRTL ? "مستخدم جديد" : "New User")}</h2>
            <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>{isRTL ? "اسم العرض" : "Display Name"}</Label><Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} /></div>
            {!editing && (
              <>
                <div><Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>{isRTL ? "كلمة المرور" : "Password"}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars: Aa1@..." /></div>
              </>
            )}
            <div>
              <Label>{isRTL ? "الفرع" : "Branch"}</Label>
              <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الفرع" : "Select Branch"} /></SelectTrigger>
                <SelectContent>
                  {branches?.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isRTL ? "الدور" : "Role"}</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{isRTL ? "كاشير" : "Cashier"}</SelectItem>
                  <SelectItem value="branch_manager">{isRTL ? "مدير فرع" : "Branch Manager"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.display_name || !form.branch_id || (!editing && (!form.email || !form.password))}>
              <Save className="h-4 w-4 me-2" />
              {createMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
              <TableHead>{isRTL ? "الدور" : "Role"}</TableHead>
              <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(posUsers || []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.display_name}</TableCell>
                <TableCell><Badge variant="outline">{isRTL ? roleLabels[u.role]?.ar : roleLabels[u.role]?.en}</Badge></TableCell>
                <TableCell>{isRTL ? u.branches?.name : u.branches?.name_en || u.branches?.name}</TableCell>
                <TableCell>
                  <Switch checked={u.is_active} onCheckedChange={v => toggleActiveMutation.mutate({ id: u.id, is_active: v })} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                      setEditing(u);
                      setForm({ email: "", password: "", display_name: u.display_name, branch_id: u.branch_id, role: u.role });
                      setShowForm(true);
                    }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(u.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(posUsers || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {isRTL ? "لا يوجد مستخدمون" : "No POS users found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default POSUsers;
