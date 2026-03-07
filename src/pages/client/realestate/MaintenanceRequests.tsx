import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Wrench, ArrowLeft, ArrowRight } from "lucide-react";

const MaintenanceRequests = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["re-maintenance", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("re_maintenance_requests")
        .select("*, re_tenants(name, name_en), re_units(unit_number)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const statusBadge = (s: string) => {
    const map: Record<string, { l: string; a: string; v: "default" | "secondary" | "destructive" | "outline" }> = {
      open: { l: "Open", a: "مفتوح", v: "destructive" },
      in_progress: { l: "In Progress", a: "قيد التنفيذ", v: "outline" },
      completed: { l: "Completed", a: "مكتمل", v: "default" },
      cancelled: { l: "Cancelled", a: "ملغي", v: "secondary" },
    };
    const m = map[s] || { l: s, a: s, v: "outline" as const };
    return <Badge variant={m.v}>{isRTL ? m.a : m.l}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client")}>
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              {isRTL ? "طلبات الصيانة" : "Maintenance Requests"}
            </h1>
          </div>
        </div>
        <Button onClick={() => navigate("/client/realestate/maintenance/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "طلب صيانة جديد" : "New Request"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الوصف" : "Description"}</TableHead>
                <TableHead>{isRTL ? "المستأجر" : "Tenant"}</TableHead>
                <TableHead>{isRTL ? "الوحدة" : "Unit"}</TableHead>
                <TableHead>{isRTL ? "الأولوية" : "Priority"}</TableHead>
                <TableHead className="text-end tabular-nums">{isRTL ? "التكلفة" : "Cost"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="tabular-nums">{isRTL ? "التاريخ" : "Date"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد طلبات" : "No requests"}</TableCell></TableRow>
              ) : (
                requests.map((r: any, idx: number) => (
                  <TableRow key={r.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium max-w-[200px] truncate">{r.description}</TableCell>
                    <TableCell>{isRTL ? r.re_tenants?.name : (r.re_tenants?.name_en || r.re_tenants?.name)}</TableCell>
                    <TableCell>{r.re_units?.unit_number}</TableCell>
                    <TableCell>
                      <Badge variant={r.priority === "high" ? "destructive" : r.priority === "medium" ? "outline" : "secondary"}>
                        {r.priority === "high" ? (isRTL ? "عالية" : "High") : r.priority === "medium" ? (isRTL ? "متوسطة" : "Medium") : (isRTL ? "منخفضة" : "Low")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{r.estimated_cost ? Number(r.estimated_cost).toLocaleString() : "-"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="tabular-nums">{r.request_date}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceRequests;
