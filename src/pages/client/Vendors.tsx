import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Truck, Eye, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const Vendors = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", companyId!)
        .eq("type", "vendor")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.name_en && v.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.phone && v.phone.includes(searchTerm)) ||
    (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "الموردين" : "Vendors"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة بيانات الموردين" : "Manage vendor data"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/contacts/new?type=vendor")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "إضافة مورد" : "Add Vendor"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {isRTL ? "قائمة الموردين" : "Vendors List"}
            <Badge variant="secondary" className="ms-2">{filtered.length}</Badge>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم أو الهاتف أو البريد..." : "Search by name, phone or email..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا يوجد موردين بعد" : "No vendors yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإضافة أول مورد" : "Start by adding your first vendor"}
              </p>
              <Button className="gap-2" onClick={() => navigate("/client/contacts/new?type=vendor")}>
                <Plus className="h-4 w-4" />
                {isRTL ? "إضافة مورد" : "Add Vendor"}
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
                    <TableHead>{isRTL ? "البريد" : "Email"}</TableHead>
                    <TableHead>{isRTL ? "المدينة" : "City"}</TableHead>
                    <TableHead>{isRTL ? "الرقم الضريبي" : "Tax No."}</TableHead>
                    <TableHead>{isRTL ? "الرصيد" : "Balance"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        {isRTL ? vendor.name : (vendor.name_en || vendor.name)}
                      </TableCell>
                      <TableCell>{vendor.phone || "-"}</TableCell>
                      <TableCell>{vendor.email || "-"}</TableCell>
                      <TableCell>{vendor.city || "-"}</TableCell>
                      <TableCell>{vendor.tax_number || "-"}</TableCell>
                      <TableCell>{(vendor.balance ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={vendor.is_active ? "default" : "secondary"}>
                          {vendor.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendors;
