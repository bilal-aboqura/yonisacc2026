import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Truck, Eye, Edit, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ContactViewDialog from "@/components/client/ContactViewDialog";

const Vendors = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewContact, setViewContact] = useState<any>(null);
  const [deleteContact, setDeleteContact] = useState<any>(null);

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

  const handleDelete = async () => {
    if (!deleteContact) return;
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", deleteContact.id);
      if (error) throw error;
      toast.success(isRTL ? "تم حذف المورد بنجاح" : "Vendor deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    } catch (error: any) {
      toast.error(error.message || (isRTL ? "خطأ في الحذف" : "Delete failed"));
    } finally {
      setDeleteContact(null);
    }
  };

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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewContact(vendor)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/contacts/${vendor.id}/edit`)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteContact(vendor)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "حذف" : "Delete"}</TooltipContent>
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

      <ContactViewDialog contact={viewContact} open={!!viewContact} onOpenChange={(open) => !open && setViewContact(null)} />

      <AlertDialog open={!!deleteContact} onOpenChange={(open) => !open && setDeleteContact(null)}>
        <AlertDialogContent className={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف المورد "${deleteContact?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${deleteContact?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vendors;
