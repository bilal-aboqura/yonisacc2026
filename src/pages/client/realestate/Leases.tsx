import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Leases = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: leases = [], isLoading } = useQuery({
    queryKey: ["re-leases", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("re_leases")
        .select("*, re_tenants(name, name_en), re_units(unit_number, re_properties(name, name_en))")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("re_leases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["re-leases"] });
    },
  });

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Active", labelAr: "ساري", variant: "default" },
      expired: { label: "Expired", labelAr: "منتهي", variant: "destructive" },
      terminated: { label: "Terminated", labelAr: "ملغي", variant: "secondary" },
    };
    const m = map[s] || { label: s, labelAr: s, variant: "outline" as const };
    return <Badge variant={m.variant}>{isRTL ? m.labelAr : m.label}</Badge>;
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
              <FileText className="h-6 w-6 text-primary" />
              {isRTL ? "عقود الإيجار" : "Lease Contracts"}
            </h1>
          </div>
        </div>
        <Button onClick={() => navigate("/client/realestate/leases/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة عقد" : "Add Lease"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "رقم العقد" : "Lease #"}</TableHead>
                <TableHead>{isRTL ? "المستأجر" : "Tenant"}</TableHead>
                <TableHead>{isRTL ? "الوحدة" : "Unit"}</TableHead>
                <TableHead>{isRTL ? "بداية" : "Start"}</TableHead>
                <TableHead>{isRTL ? "نهاية" : "End"}</TableHead>
                <TableHead className="text-end tabular-nums">{isRTL ? "الإيجار الشهري" : "Monthly Rent"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : leases.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد عقود" : "No leases"}</TableCell></TableRow>
              ) : (
                leases.map((l: any, idx: number) => (
                  <TableRow key={l.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium tabular-nums">{l.lease_number}</TableCell>
                    <TableCell>{isRTL ? l.re_tenants?.name : (l.re_tenants?.name_en || l.re_tenants?.name)}</TableCell>
                    <TableCell>{l.re_units?.unit_number}</TableCell>
                    <TableCell className="tabular-nums">{l.start_date}</TableCell>
                    <TableCell className="tabular-nums">{l.end_date}</TableCell>
                    <TableCell className="text-end tabular-nums">{Number(l.monthly_rent || 0).toLocaleString()}</TableCell>
                    <TableCell>{statusBadge(l.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/client/realestate/leases/${l.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(l.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
};

export default Leases;
