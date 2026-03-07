import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";

const POSUserLogs = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");

  const { data: branches } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: sessions } = useQuery({
    queryKey: ["pos-session-logs", companyId, dateFrom, dateTo, filterBranch],
    queryFn: async () => {
      let query = supabase.from("pos_sessions" as any)
        .select("*, branches!pos_sessions_branch_id_fkey(name, name_en)")
        .eq("company_id", companyId!)
        .eq("status", "closed")
        .order("closed_at", { ascending: false });

      if (filterBranch !== "all") query = query.eq("branch_id", filterBranch);
      if (dateFrom) query = query.gte("opened_at", dateFrom);
      if (dateTo) query = query.lte("closed_at", dateTo + "T23:59:59");

      const { data } = await query.limit(100);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const { data: posUsers } = useQuery({
    queryKey: ["pos-users-map", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("pos_users" as any).select("user_id, display_name").eq("company_id", companyId!);
      const map: Record<string, string> = {};
      (data || []).forEach((u: any) => { map[u.user_id] = u.display_name; });
      return map;
    },
    enabled: !!companyId,
  });

  const formatDt = (dt: string) => {
    try { return format(new Date(dt), "yyyy-MM-dd HH:mm"); } catch { return "-"; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "سجل المستخدمين" : "User Session Logs"}</h1>
        <p className="text-sm text-muted-foreground">{isRTL ? "سجل جلسات مستخدمي نقاط البيع" : "POS user session history"}</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div><Label>{isRTL ? "من تاريخ" : "From"}</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div><Label>{isRTL ? "إلى تاريخ" : "To"}</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <div>
            <Label>{isRTL ? "الفرع" : "Branch"}</Label>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                {branches?.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "المستخدم" : "User"}</TableHead>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "وقت الدخول" : "Login"}</TableHead>
                <TableHead>{isRTL ? "وقت الخروج" : "Logout"}</TableHead>
                <TableHead>{isRTL ? "المبيعات" : "Sales"}</TableHead>
                <TableHead>{isRTL ? "المرتجعات" : "Returns"}</TableHead>
                <TableHead>{isRTL ? "الخصومات" : "Discounts"}</TableHead>
                <TableHead>{isRTL ? "رصيد الإغلاق" : "Closing"}</TableHead>
                <TableHead>{isRTL ? "طرق الدفع" : "Payments"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sessions || []).map((s: any) => {
                const ps = s.payment_summary || {};
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{posUsers?.[s.opened_by] || s.opened_by?.slice(0, 8)}</TableCell>
                    <TableCell>{isRTL ? s.branches?.name : s.branches?.name_en || s.branches?.name}</TableCell>
                    <TableCell className="text-xs">{formatDt(s.opened_at)}</TableCell>
                    <TableCell className="text-xs">{s.closed_at ? formatDt(s.closed_at) : "-"}</TableCell>
                    <TableCell>{(s.total_sales || 0).toFixed(2)}</TableCell>
                    <TableCell>{(s.total_returns || 0).toFixed(2)}</TableCell>
                    <TableCell>{(s.total_discounts || 0).toFixed(2)}</TableCell>
                    <TableCell>{(s.closing_amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {Object.entries(ps).map(([k, v]) => (
                        <div key={k}><Badge variant="outline" className="me-1 mb-1">{k}: {(v as number).toFixed(2)}</Badge></div>
                      ))}
                      {Object.keys(ps).length === 0 && "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(sessions || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {isRTL ? "لا توجد سجلات" : "No logs found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default POSUserLogs;
