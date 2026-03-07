import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Eye, Edit, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Patients = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("patients").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const filtered = patients.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          {isRTL ? "سجل المرضى" : "Patient Records"}
        </h1>
        <Button onClick={() => navigate("/client/clinic/patients/new")}>
          <Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة مريض" : "Add Patient"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم أو الرقم أو الهاتف..." : "Search by name, number or phone..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الرقم" : "Number"}</TableHead>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
                  <TableHead>{isRTL ? "الجنس" : "Gender"}</TableHead>
                  <TableHead>{isRTL ? "التأمين" : "Insurance"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isRTL ? "لا يوجد مرضى" : "No patients found"}</TableCell></TableRow>
                ) : filtered.map((p: any, idx: number) => (
                  <TableRow key={p.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="font-mono text-sm tabular-nums">{p.patient_number}</TableCell>
                    <TableCell className="font-medium">{isRTL ? p.name : p.name_en || p.name}</TableCell>
                    <TableCell>{p.phone || p.mobile || "-"}</TableCell>
                    <TableCell>{p.gender === "male" ? (isRTL ? "ذكر" : "Male") : (isRTL ? "أنثى" : "Female")}</TableCell>
                    <TableCell>{p.insurance_provider || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/client/clinic/patients/${p.id}`)} title={isRTL ? "عرض" : "View"}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/client/clinic/patients/${p.id}/edit`)} title={isRTL ? "تعديل" : "Edit"}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Patients;
