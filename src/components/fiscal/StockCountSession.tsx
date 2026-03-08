import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  fiscalYearId: string | null;
}

const StockCountSession = ({ fiscalYearId }: Props) => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["stock-count-sessions", companyId, fiscalYearId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stock_count_sessions").select("*")
        .eq("company_id", companyId).eq("fiscal_year_id", fiscalYearId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!fiscalYearId,
  });

  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [physicalQtys, setPhysicalQtys] = useState<Record<string, number>>({});

  const { data: lines = [], isLoading: loadingLines } = useQuery({
    queryKey: ["stock-count-lines", activeSession],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stock_count_lines")
        .select("*, products:product_id(name, name_en, sku), warehouses:warehouse_id(name, name_en)")
        .eq("session_id", activeSession);
      if (error) throw error;
      return data;
    },
    enabled: !!activeSession,
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      // Create session
      const { data: session, error: sErr } = await (supabase as any)
        .from("stock_count_sessions")
        .insert({ company_id: companyId, fiscal_year_id: fiscalYearId, created_by: user?.id, status: "in_progress" })
        .select().single();
      if (sErr) throw sErr;

      // Get all products with stock across warehouses
      const { data: stocks, error: stErr } = await (supabase as any)
        .from("warehouse_stock")
        .select("product_id, warehouse_id, quantity, average_cost")
        .eq("company_id", companyId);
      if (stErr) throw stErr;

      if (stocks && stocks.length > 0) {
        const lines = stocks.map((s: any) => ({
          session_id: session.id,
          product_id: s.product_id,
          warehouse_id: s.warehouse_id,
          system_quantity: s.quantity || 0,
          unit_cost: s.average_cost || 0,
        }));
        const { error: lErr } = await (supabase as any).from("stock_count_lines").insert(lines);
        if (lErr) throw lErr;
      }

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["stock-count-sessions"] });
      setActiveSession(session.id);
      toast.success(isRTL ? "تم إنشاء جلسة الجرد" : "Stock count session created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveLinesMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(physicalQtys).map(([id, qty]) =>
        (supabase as any).from("stock_count_lines").update({ physical_quantity: qty }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-count-lines"] });
      toast.success(isRTL ? "تم حفظ الكميات" : "Quantities saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("stock_count_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", activeSession);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-count-sessions"] });
      toast.success(isRTL ? "تم إكمال الجرد" : "Stock count completed");
    },
  });

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      draft: ["مسودة", "Draft"],
      in_progress: ["قيد التنفيذ", "In Progress"],
      completed: ["مكتمل", "Completed"],
      approved: ["معتمد", "Approved"],
    };
    return isRTL ? (map[s]?.[0] || s) : (map[s]?.[1] || s);
  };

  if (!fiscalYearId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isRTL ? "يرجى اختيار سنة مالية أولاً" : "Please select a fiscal year first"}
        </CardContent>
      </Card>
    );
  }

  if (activeSession) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {isRTL ? "جرد المخزون" : "Stock Count"}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveSession(null)}>
                {isRTL ? "رجوع" : "Back"}
              </Button>
              <Button variant="outline" onClick={() => saveLinesMutation.mutate()} disabled={saveLinesMutation.isPending}>
                {isRTL ? "حفظ" : "Save"}
              </Button>
              <Button onClick={() => completeSessionMutation.mutate()} disabled={completeSessionMutation.isPending}>
                <CheckCircle2 className="h-4 w-4 me-2" />
                {isRTL ? "إكمال الجرد" : "Complete Count"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLines ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : lines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "لا توجد أصناف في المخزون" : "No stock items found"}
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border/50 max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>{isRTL ? "المنتج" : "Product"}</TableHead>
                    <TableHead>{isRTL ? "المستودع" : "Warehouse"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "كمية النظام" : "System Qty"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "الكمية الفعلية" : "Physical Qty"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "الفرق" : "Variance"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "تكلفة الوحدة" : "Unit Cost"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line: any) => {
                    const physQty = physicalQtys[line.id] ?? line.physical_quantity ?? "";
                    const variance = physQty !== "" && physQty !== null ? Number(physQty) - Number(line.system_quantity) : null;
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">
                          {isRTL ? line.products?.name : (line.products?.name_en || line.products?.name)}
                        </TableCell>
                        <TableCell>
                          {isRTL ? line.warehouses?.name : (line.warehouses?.name_en || line.warehouses?.name)}
                        </TableCell>
                        <TableCell className="text-center">{line.system_quantity}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            className="w-24 mx-auto text-center"
                            value={physQty}
                            onChange={(e) => setPhysicalQtys({ ...physicalQtys, [line.id]: Number(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell className={`text-center font-medium ${variance && variance !== 0 ? (variance > 0 ? "text-emerald-600" : "text-destructive") : ""}`}>
                          {variance !== null ? (variance > 0 ? `+${variance}` : variance) : "-"}
                        </TableCell>
                        <TableCell className="text-center">{Number(line.unit_cost).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isRTL ? "جلسات جرد المخزون" : "Stock Count Sessions"}
          </CardTitle>
          <Button onClick={() => createSessionMutation.mutate()} disabled={createSessionMutation.isPending}>
            {createSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Plus className="h-4 w-4 me-2" />}
            {isRTL ? "جلسة جرد جديدة" : "New Stock Count"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingSessions ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? "لا توجد جلسات جرد" : "No stock count sessions"}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setActiveSession(s.id)}>
                <div>
                  <p className="font-medium text-sm">{new Date(s.created_at).toLocaleDateString()}</p>
                  <Badge variant={s.status === "completed" ? "default" : "secondary"}>{statusLabel(s.status)}</Badge>
                </div>
                {s.completed_at && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "اكتمل:" : "Completed:"} {new Date(s.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockCountSession;
