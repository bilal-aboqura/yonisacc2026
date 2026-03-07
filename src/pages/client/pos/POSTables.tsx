import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Edit, Trash2, Users, UtensilsCrossed, Calendar } from "lucide-react";
import BranchSelector from "@/components/client/BranchSelector";

const POSTables = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [tableDialog, setTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [form, setForm] = useState({ table_number: "", capacity: 4, floor_level: 1, shape: "square" });

  const { data: tables, isLoading } = useQuery({
    queryKey: ["pos-tables", companyId, selectedBranch],
    queryFn: async () => {
      let query = supabase.from("pos_tables" as any).select("*").eq("company_id", companyId!);
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      const { data } = await query.order("table_number");
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const floors = [...new Set((tables || []).map((t: any) => t.floor_level))].sort();
  const filteredTables = (tables || []).filter((t: any) => t.floor_level === selectedFloor);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, branch_id: selectedBranch } as any;
      if (editingTable) {
        const { error } = await supabase.from("pos_tables" as any).update(payload).eq("id", editingTable.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pos_tables" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setTableDialog(false);
      setEditingTable(null);
      queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
    },
    onError: () => toast.error(isRTL ? "خطأ" : "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_tables" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
    },
  });

  const statusColors: Record<string, string> = {
    available: "bg-success/20 text-success border-success/30",
    occupied: "bg-destructive/20 text-destructive border-destructive/30",
    reserved: "bg-warning/20 text-warning border-warning/30",
  };

  const statusLabels: Record<string, { ar: string; en: string }> = {
    available: { ar: "متاحة", en: "Available" },
    occupied: { ar: "مشغولة", en: "Occupied" },
    reserved: { ar: "محجوزة", en: "Reserved" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة الطاولات" : "Table Management"}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? "إدارة طاولات المطعم والحجوزات" : "Manage restaurant tables and reservations"}</p>
        </div>
        <Button onClick={() => { setEditingTable(null); setForm({ table_number: "", capacity: 4, floor_level: selectedFloor, shape: "square" }); setTableDialog(true); }}>
          <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة طاولة" : "Add Table"}
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <BranchSelector companyId={companyId!} value={selectedBranch} onChange={setSelectedBranch} />
        {floors.length > 0 && (
          <div className="flex gap-1">
            {floors.map((f) => (
              <Button key={f} size="sm" variant={selectedFloor === f ? "default" : "outline"} onClick={() => setSelectedFloor(f)}>
                {isRTL ? `الطابق ${f}` : `Floor ${f}`}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredTables.map((table: any) => (
          <Card key={table.id} className={cn("cursor-pointer hover:shadow-md transition-shadow border-2", statusColors[table.status] || "")}>
            <CardContent className="p-4 text-center space-y-2">
              <div className={cn(
                "mx-auto flex items-center justify-center text-2xl font-bold",
                table.shape === "circle" ? "w-16 h-16 rounded-full border-2" : "w-16 h-16 rounded-lg border-2",
                statusColors[table.status] || ""
              )}>
                {table.table_number}
              </div>
              <Badge variant="outline" className={cn("text-xs", statusColors[table.status])}>
                {isRTL ? statusLabels[table.status]?.ar : statusLabels[table.status]?.en}
              </Badge>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {table.capacity}
              </div>
              <div className="flex gap-1 justify-center">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingTable(table); setForm({ table_number: table.table_number, capacity: table.capacity, floor_level: table.floor_level, shape: table.shape }); setTableDialog(true); }}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(table.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredTables.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{isRTL ? "لا توجد طاولات" : "No tables found"}</p>
          </div>
        )}
      </div>

      {/* Table Dialog */}
      <Dialog open={tableDialog} onOpenChange={setTableDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editingTable ? (isRTL ? "تعديل طاولة" : "Edit Table") : (isRTL ? "إضافة طاولة" : "Add Table")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{isRTL ? "رقم الطاولة" : "Table Number"}</Label><Input value={form.table_number} onChange={(e) => setForm(f => ({ ...f, table_number: e.target.value }))} /></div>
            <div><Label>{isRTL ? "السعة" : "Capacity"}</Label><Input type="number" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 4 }))} /></div>
            <div><Label>{isRTL ? "الطابق" : "Floor"}</Label><Input type="number" value={form.floor_level} onChange={(e) => setForm(f => ({ ...f, floor_level: parseInt(e.target.value) || 1 }))} /></div>
            <div>
              <Label>{isRTL ? "الشكل" : "Shape"}</Label>
              <Select value={form.shape} onValueChange={(v) => setForm(f => ({ ...f, shape: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">{isRTL ? "مربع" : "Square"}</SelectItem>
                  <SelectItem value="circle">{isRTL ? "دائري" : "Circle"}</SelectItem>
                  <SelectItem value="rectangle">{isRTL ? "مستطيل" : "Rectangle"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.table_number}>
              {saveMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTables;
