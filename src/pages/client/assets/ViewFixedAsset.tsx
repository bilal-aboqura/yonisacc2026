import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, ArrowLeft, Edit, Building2, Calendar, DollarSign, Wrench } from "lucide-react";

const ViewFixedAsset = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: asset } = useQuery({
    queryKey: ["fixed-asset", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fixed_assets")
        .select("*, category:category_id(name, name_en), branch:branch_id(name, name_en)")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: depreciationEntries } = useQuery({
    queryKey: ["asset-depreciation", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("asset_depreciation_entries")
        .select("*")
        .eq("asset_id", id)
        .order("period_date", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: maintenanceRecords } = useQuery({
    queryKey: ["asset-maintenance", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("asset_maintenance_records")
        .select("*")
        .eq("asset_id", id)
        .order("maintenance_date", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  if (!asset) return null;

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const depreciableAmount = (asset.purchase_cost || 0) - (asset.salvage_value || 0);
  const monthlyDep = depreciableAmount / (asset.useful_life_months || 60);
  const totalDepreciated = depreciationEntries?.reduce((s: number, e: any) => s + (e.depreciation_amount || 0), 0) || 0;
  const bookValue = asset.purchase_cost - totalDepreciated;
  const depPercent = depreciableAmount > 0 ? (totalDepreciated / depreciableAmount) * 100 : 0;

  const methodLabels: Record<string, string> = {
    straight_line: isRTL ? "القسط الثابت" : "Straight Line",
    declining_balance: isRTL ? "القسط المتناقص" : "Declining Balance",
    units_of_production: isRTL ? "وحدات الإنتاج" : "Units of Production",
  };

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/assets")}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? asset.name : (asset.name_en || asset.name)}</h1>
            <p className="text-sm text-muted-foreground font-mono">{asset.asset_code}</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/client/assets/${id}/edit`)} className="gap-2">
          <Edit className="h-4 w-4" />
          {isRTL ? "تعديل" : "Edit"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "تكلفة الشراء" : "Purchase Cost"}</p>
                <p className="text-xl font-bold">{asset.purchase_cost?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "الإهلاك المتراكم" : "Accumulated Dep."}</p>
                <p className="text-xl font-bold">{totalDepreciated.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "القيمة الدفترية" : "Book Value"}</p>
                <p className="text-xl font-bold">{bookValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "نسبة الإهلاك" : "Dep. Progress"}</p>
                <p className="text-xl font-bold">{depPercent.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{isRTL ? "التفاصيل" : "Details"}</TabsTrigger>
          <TabsTrigger value="depreciation">{isRTL ? "الإهلاك" : "Depreciation"}</TabsTrigger>
          <TabsTrigger value="maintenance">{isRTL ? "الصيانة" : "Maintenance"}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: isRTL ? "التصنيف" : "Category", value: asset.category ? (isRTL ? asset.category.name : asset.category.name_en || asset.category.name) : "—" },
                  { label: isRTL ? "الفرع" : "Branch", value: asset.branch ? (isRTL ? asset.branch.name : asset.branch.name_en || asset.branch.name) : "—" },
                  { label: isRTL ? "الموقع" : "Location", value: asset.location || "—" },
                  { label: isRTL ? "الرقم التسلسلي" : "Serial Number", value: asset.serial_number || "—" },
                  { label: isRTL ? "الباركود" : "Barcode", value: asset.barcode || "—" },
                  { label: isRTL ? "تاريخ الشراء" : "Purchase Date", value: asset.purchase_date },
                  { label: isRTL ? "طريقة الإهلاك" : "Depreciation Method", value: methodLabels[asset.depreciation_method] || asset.depreciation_method },
                  { label: isRTL ? "العمر الافتراضي" : "Useful Life", value: `${asset.useful_life_months} ${isRTL ? "شهر" : "months"}` },
                  { label: isRTL ? "قيمة الخردة" : "Salvage Value", value: (asset.salvage_value || 0).toLocaleString() },
                  { label: isRTL ? "الإهلاك الشهري" : "Monthly Depreciation", value: monthlyDep.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
                  { label: isRTL ? "انتهاء الضمان" : "Warranty Expiry", value: asset.warranty_expiry || "—" },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {asset.notes && (
                <div className="mt-6 space-y-1">
                  <p className="text-sm text-muted-foreground">{isRTL ? "ملاحظات" : "Notes"}</p>
                  <p>{asset.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation">
          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الفترة" : "Period"}</TableHead>
                    <TableHead>{isRTL ? "مبلغ الإهلاك" : "Depreciation"}</TableHead>
                    <TableHead>{isRTL ? "الإهلاك المتراكم" : "Accumulated"}</TableHead>
                    <TableHead>{isRTL ? "القيمة الدفترية" : "Book Value"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!depreciationEntries || depreciationEntries.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {isRTL ? "لا توجد قيود إهلاك بعد" : "No depreciation entries yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    depreciationEntries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.period_date}</TableCell>
                        <TableCell>{entry.depreciation_amount?.toLocaleString()}</TableCell>
                        <TableCell>{entry.accumulated_amount?.toLocaleString()}</TableCell>
                        <TableCell>{entry.book_value?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={entry.is_posted ? "default" : "secondary"}>
                            {entry.is_posted ? (isRTL ? "مرحّل" : "Posted") : (isRTL ? "مسودة" : "Draft")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isRTL ? "الوصف" : "Description"}</TableHead>
                    <TableHead>{isRTL ? "التكلفة" : "Cost"}</TableHead>
                    <TableHead>{isRTL ? "المنفذ" : "Performed By"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!maintenanceRecords || maintenanceRecords.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {isRTL ? "لا توجد سجلات صيانة" : "No maintenance records"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    maintenanceRecords.map((rec: any) => (
                      <TableRow key={rec.id}>
                        <TableCell>{rec.maintenance_date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rec.maintenance_type === "preventive" ? (isRTL ? "وقائية" : "Preventive") : (isRTL ? "طارئة" : "Emergency")}
                          </Badge>
                        </TableCell>
                        <TableCell>{rec.description}</TableCell>
                        <TableCell>{rec.cost?.toLocaleString()}</TableCell>
                        <TableCell>{rec.performed_by || "—"}</TableCell>
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

export default ViewFixedAsset;
