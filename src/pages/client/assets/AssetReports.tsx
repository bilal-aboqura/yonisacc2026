import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, TrendingDown, Wrench, DollarSign } from "lucide-react";

const AssetReports = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();

  const { data: assets } = useQuery({
    queryKey: ["fixed-assets-report", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fixed_assets")
        .select("*, category:category_id(name, name_en), depreciation_entries:asset_depreciation_entries(depreciation_amount)")
        .eq("company_id", companyId)
        .order("asset_code");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: maintenance } = useQuery({
    queryKey: ["maintenance-report", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("asset_maintenance_records")
        .select("*, asset:asset_id(name, name_en, asset_code)")
        .eq("company_id", companyId)
        .order("maintenance_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Calculate summaries
  const totalPurchaseCost = assets?.reduce((s: number, a: any) => s + (a.purchase_cost || 0), 0) || 0;
  const totalAccDep = assets?.reduce((s: number, a: any) => {
    const dep = a.depreciation_entries?.reduce((s2: number, e: any) => s2 + (e.depreciation_amount || 0), 0) || 0;
    return s + dep;
  }, 0) || 0;
  const totalBookValue = totalPurchaseCost - totalAccDep;
  const totalMaintenanceCost = maintenance?.reduce((s: number, m: any) => s + (m.cost || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? "تقارير الأصول الثابتة" : "Fixed Asset Reports"}</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? "إجمالي تكلفة الأصول" : "Total Asset Cost", value: totalPurchaseCost.toLocaleString(), icon: DollarSign, color: "text-primary" },
          { label: isRTL ? "الإهلاك المتراكم" : "Accumulated Depreciation", value: totalAccDep.toLocaleString(), icon: TrendingDown, color: "text-amber-600" },
          { label: isRTL ? "القيمة الدفترية" : "Total Book Value", value: totalBookValue.toLocaleString(), icon: Building2, color: "text-emerald-600" },
          { label: isRTL ? "مصروفات الصيانة" : "Maintenance Costs", value: totalMaintenanceCost.toLocaleString(), icon: Wrench, color: "text-blue-600" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">{isRTL ? "سجل الأصول" : "Asset Register"}</TabsTrigger>
          <TabsTrigger value="depreciation">{isRTL ? "ملخص الإهلاك" : "Depreciation Summary"}</TabsTrigger>
          <TabsTrigger value="maintenance">{isRTL ? "تكاليف الصيانة" : "Maintenance Costs"}</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card>
            <CardHeader><CardTitle>{isRTL ? "سجل الأصول الثابتة" : "Fixed Asset Register"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الكود" : "Code"}</TableHead>
                    <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
                    <TableHead>{isRTL ? "تاريخ الشراء" : "Purchase Date"}</TableHead>
                    <TableHead>{isRTL ? "التكلفة" : "Cost"}</TableHead>
                    <TableHead>{isRTL ? "الإهلاك المتراكم" : "Acc. Dep."}</TableHead>
                    <TableHead>{isRTL ? "القيمة الدفترية" : "Book Value"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!assets || assets.length === 0) ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد أصول" : "No assets"}</TableCell></TableRow>
                  ) : (
                    assets.map((a: any) => {
                      const accDep = a.depreciation_entries?.reduce((s: number, e: any) => s + (e.depreciation_amount || 0), 0) || 0;
                      const bookVal = (a.purchase_cost || 0) - accDep;
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-sm">{a.asset_code}</TableCell>
                          <TableCell className="font-medium">{isRTL ? a.name : (a.name_en || a.name)}</TableCell>
                          <TableCell>{a.category ? (isRTL ? a.category.name : a.category.name_en || a.category.name) : "—"}</TableCell>
                          <TableCell>{a.purchase_date}</TableCell>
                          <TableCell>{a.purchase_cost?.toLocaleString()}</TableCell>
                          <TableCell className="text-amber-600">{accDep.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">{bookVal.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === "active" ? "default" : "secondary"}>
                              {a.status === "active" ? (isRTL ? "نشط" : "Active") : a.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation">
          <Card>
            <CardHeader><CardTitle>{isRTL ? "ملخص الإهلاك" : "Depreciation Summary"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الأصل" : "Asset"}</TableHead>
                    <TableHead>{isRTL ? "التكلفة" : "Cost"}</TableHead>
                    <TableHead>{isRTL ? "قيمة الخردة" : "Salvage"}</TableHead>
                    <TableHead>{isRTL ? "القيمة القابلة للإهلاك" : "Depreciable"}</TableHead>
                    <TableHead>{isRTL ? "الإهلاك المتراكم" : "Acc. Dep."}</TableHead>
                    <TableHead>{isRTL ? "القيمة الدفترية" : "Book Value"}</TableHead>
                    <TableHead>{isRTL ? "نسبة الإهلاك" : "% Depreciated"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets?.map((a: any) => {
                    const accDep = a.depreciation_entries?.reduce((s: number, e: any) => s + (e.depreciation_amount || 0), 0) || 0;
                    const depreciable = (a.purchase_cost || 0) - (a.salvage_value || 0);
                    const bookVal = (a.purchase_cost || 0) - accDep;
                    const pct = depreciable > 0 ? (accDep / depreciable * 100) : 0;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{isRTL ? a.name : (a.name_en || a.name)}</TableCell>
                        <TableCell>{a.purchase_cost?.toLocaleString()}</TableCell>
                        <TableCell>{(a.salvage_value || 0).toLocaleString()}</TableCell>
                        <TableCell>{depreciable.toLocaleString()}</TableCell>
                        <TableCell className="text-amber-600">{accDep.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">{bookVal.toLocaleString()}</TableCell>
                        <TableCell>{pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader><CardTitle>{isRTL ? "سجل الصيانة" : "Maintenance Log"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الأصل" : "Asset"}</TableHead>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isRTL ? "الوصف" : "Description"}</TableHead>
                    <TableHead>{isRTL ? "التكلفة" : "Cost"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!maintenance || maintenance.length === 0) ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد سجلات صيانة" : "No maintenance records"}</TableCell></TableRow>
                  ) : (
                    maintenance.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.asset ? (isRTL ? m.asset.name : (m.asset.name_en || m.asset.name)) : "—"}</TableCell>
                        <TableCell>{m.maintenance_date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {m.maintenance_type === "preventive" ? (isRTL ? "وقائية" : "Preventive") : (isRTL ? "طارئة" : "Emergency")}
                          </Badge>
                        </TableCell>
                        <TableCell>{m.description}</TableCell>
                        <TableCell>{m.cost?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetReports;
