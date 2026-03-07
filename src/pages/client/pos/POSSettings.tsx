import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Monitor, Printer, Clock, Settings } from "lucide-react";
import BranchSelector from "@/components/client/BranchSelector";

const POSSettings = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [terminalDialog, setTerminalDialog] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<any>(null);
  const [form, setForm] = useState({ name: "", name_en: "", terminal_type: "retail", is_active: true });

  const { data: terminals } = useQuery({
    queryKey: ["pos-terminals", companyId, selectedBranch],
    queryFn: async () => {
      let query = supabase.from("pos_terminals" as any).select("*, branches(name, name_en)").eq("company_id", companyId!);
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      const { data } = await query.order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, branch_id: selectedBranch } as any;
      if (editingTerminal) {
        const { error } = await supabase.from("pos_terminals" as any).update(payload).eq("id", editingTerminal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pos_terminals" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setTerminalDialog(false);
      setEditingTerminal(null);
      queryClient.invalidateQueries({ queryKey: ["pos-terminals"] });
    },
    onError: () => toast.error(isRTL ? "خطأ" : "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_terminals" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["pos-terminals"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "إعدادات نقاط البيع" : "POS Settings"}</h1>
        <p className="text-sm text-muted-foreground">{isRTL ? "إدارة نقاط البيع والطابعات والإعدادات" : "Manage terminals, printers, and settings"}</p>
      </div>

      <Tabs defaultValue="terminals" dir={isRTL ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="terminals" className="gap-2"><Monitor className="h-4 w-4" />{isRTL ? "نقاط البيع" : "Terminals"}</TabsTrigger>
          <TabsTrigger value="printers" className="gap-2"><Printer className="h-4 w-4" />{isRTL ? "الطابعات" : "Printers"}</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" />{isRTL ? "عام" : "General"}</TabsTrigger>
        </TabsList>

        <TabsContent value="terminals" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <BranchSelector companyId={companyId!} value={selectedBranch} onChange={setSelectedBranch} />
            <Button onClick={() => { setEditingTerminal(null); setForm({ name: "", name_en: "", terminal_type: "retail", is_active: true }); setTerminalDialog(true); }}>
              <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة نقطة بيع" : "Add Terminal"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(terminals || []).map((terminal: any) => (
              <Card key={terminal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{isRTL ? terminal.name : terminal.name_en || terminal.name}</CardTitle>
                    <Badge variant={terminal.is_active ? "default" : "secondary"}>
                      {terminal.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                    </Badge>
                  </div>
                  <CardDescription>
                    {terminal.terminal_type === "restaurant" ? (isRTL ? "مطعم" : "Restaurant") : (isRTL ? "تجزئة" : "Retail")}
                    {terminal.branches && ` - ${isRTL ? (terminal.branches as any).name : (terminal.branches as any).name_en || (terminal.branches as any).name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingTerminal(terminal); setForm({ name: terminal.name, name_en: terminal.name_en || "", terminal_type: terminal.terminal_type, is_active: terminal.is_active }); setTerminalDialog(true); }}>
                      <Edit className="h-3 w-3 me-1" /> {isRTL ? "تعديل" : "Edit"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMutation.mutate(terminal.id)}>
                      <Trash2 className="h-3 w-3 me-1" /> {isRTL ? "حذف" : "Delete"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(terminals || []).length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{isRTL ? "لا توجد نقاط بيع" : "No terminals found"}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="printers" className="mt-4">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Printer className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? "إعدادات الطابعات ستكون متاحة قريباً" : "Printer settings coming soon"}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? "الإعدادات العامة ستكون متاحة قريباً" : "General settings coming soon"}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Terminal Dialog */}
      <Dialog open={terminalDialog} onOpenChange={setTerminalDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editingTerminal ? (isRTL ? "تعديل نقطة بيع" : "Edit Terminal") : (isRTL ? "إضافة نقطة بيع" : "Add Terminal")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{isRTL ? "الاسم بالعربي" : "Name (Arabic)"}</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (English)"}</Label><Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div>
              <Label>{isRTL ? "النوع" : "Type"}</Label>
              <Select value={form.terminal_type} onValueChange={(v) => setForm(f => ({ ...f, terminal_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">{isRTL ? "تجزئة" : "Retail"}</SelectItem>
                  <SelectItem value="restaurant">{isRTL ? "مطعم" : "Restaurant"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{isRTL ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminalDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSSettings;
