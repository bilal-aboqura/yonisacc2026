import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MenuSquare } from "lucide-react";
import BranchSelector from "@/components/client/BranchSelector";

const POSMenuManager = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [menuDialog, setMenuDialog] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [form, setForm] = useState({ name: "", name_en: "", is_active: true });

  const { data: menus } = useQuery({
    queryKey: ["pos-menus", companyId, selectedBranch],
    queryFn: async () => {
      let query = supabase.from("pos_menus" as any).select("*").eq("company_id", companyId!);
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      const { data } = await query.order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, branch_id: selectedBranch } as any;
      if (editingMenu) {
        const { error } = await supabase.from("pos_menus" as any).update(payload).eq("id", editingMenu.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pos_menus" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setMenuDialog(false);
      setEditingMenu(null);
      queryClient.invalidateQueries({ queryKey: ["pos-menus"] });
    },
    onError: () => toast.error(isRTL ? "خطأ" : "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_menus" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["pos-menus"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة المنيو" : "Menu Management"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إدارة قوائم الطعام المخصصة لكل فرع" : "Manage branch-specific menus"}</p>
        </div>
        <Button onClick={() => { setEditingMenu(null); setForm({ name: "", name_en: "", is_active: true }); setMenuDialog(true); }} disabled={!selectedBranch}>
          <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة منيو" : "Add Menu"}
        </Button>
      </div>

      <BranchSelector companyId={companyId!} value={selectedBranch} onChange={setSelectedBranch} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
              <TableHead>{isRTL ? "الاسم بالإنجليزي" : "Name (EN)"}</TableHead>
              <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(menus || []).map((menu: any) => (
              <TableRow key={menu.id}>
                <TableCell className="font-medium">{menu.name}</TableCell>
                <TableCell>{menu.name_en || "-"}</TableCell>
                <TableCell>
                  <Badge variant={menu.is_active ? "default" : "secondary"}>
                    {menu.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingMenu(menu); setForm({ name: menu.name, name_en: menu.name_en || "", is_active: menu.is_active }); setMenuDialog(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(menu.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(menus || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <MenuSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {selectedBranch ? (isRTL ? "لا توجد قوائم" : "No menus found") : (isRTL ? "اختر فرع أولاً" : "Select a branch first")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={menuDialog} onOpenChange={setMenuDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editingMenu ? (isRTL ? "تعديل منيو" : "Edit Menu") : (isRTL ? "إضافة منيو" : "Add Menu")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{isRTL ? "الاسم بالعربي" : "Name (Arabic)"}</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (English)"}</Label><Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{isRTL ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMenuDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSMenuManager;
