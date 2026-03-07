import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";

const DeliveryAreas = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ["delivery-areas-list", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("delivery_areas").select("*, branches(name, name_en)").eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("delivery_areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["delivery-areas-list"] });
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const filtered = areas.filter((a: any) => !search || a.name?.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">{isRTL ? "مناطق التوصيل" : "Delivery Areas"}</h1>
        <Button onClick={() => navigate("/client/delivery/areas/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "منطقة جديدة" : "New Area"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="ps-9" placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "اسم المنطقة" : "Area Name"}</TableHead>
                <TableHead>{isRTL ? "رسوم التوصيل" : "Delivery Fee"}</TableHead>
                <TableHead className="hidden md:table-cell">{isRTL ? "الوقت المتوقع (دقيقة)" : "Est. Time (min)"}</TableHead>
                <TableHead className="hidden md:table-cell">{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any, i: number) => (
                <TableRow key={a.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <TableCell className="font-medium">{isRTL ? a.name : a.name_en || a.name}</TableCell>
                  <TableCell className="tabular-nums">{Number(a.delivery_fee).toLocaleString()}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{a.estimated_time_minutes || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell">{isRTL ? a.branches?.name : (a.branches?.name_en || a.branches?.name) || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/delivery/areas/${a.id}/edit`)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger><TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(isRTL ? "هل أنت متأكد؟" : "Are you sure?")) deleteMutation.mutate(a.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger><TooltipContent>{isRTL ? "حذف" : "Delete"}</TooltipContent></Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد مناطق" : "No areas found"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryAreas;
