import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useState } from "react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { Truck, Eye, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ContactViewDialog from "@/components/client/ContactViewDialog";

const Vendors = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [viewContact, setViewContact] = useState<any>(null);
  const [deleteContact, setDeleteContact] = useState<any>(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, accounts:account_id(code, name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "vendor")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

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

  const columns: DataTableColumn<any>[] = [
    {
      key: "account_code",
      header: isRTL ? "رقم الحساب" : "Account Code",
      width: 120,
      render: (row) => (
        <span className="font-mono text-xs text-primary">{row.accounts?.code || "-"}</span>
      ),
    },
    {
      key: "name",
      header: isRTL ? "الاسم" : "Name",
      render: (row) => (
        <span className="font-semibold text-foreground">
          {isRTL ? row.name : (row.name_en || row.name)}
        </span>
      ),
    },
    {
      key: "phone",
      header: isRTL ? "الهاتف" : "Phone",
      render: (row) => <span dir="ltr">{row.phone || "-"}</span>,
    },
    {
      key: "email",
      header: isRTL ? "البريد" : "Email",
      render: (row) => <span className="text-muted-foreground">{row.email || "-"}</span>,
      hideOnMobile: true,
    },
    {
      key: "city",
      header: isRTL ? "المدينة" : "City",
      render: (row) => row.city || "-",
      hideOnMobile: true,
    },
    {
      key: "tax_number",
      header: isRTL ? "الرقم الضريبي" : "Tax No.",
      render: (row) => <span className="font-mono text-xs">{row.tax_number || "-"}</span>,
      hideOnMobile: true,
    },
    {
      key: "balance",
      header: isRTL ? "الرصيد" : "Balance",
      numeric: true,
      render: (row) => (row.balance ?? 0).toLocaleString(),
    },
    {
      key: "status",
      header: isRTL ? "الحالة" : "Status",
      width: 100,
      render: (row) => (
        <StatusBadge
          config={row.is_active
            ? { label: isRTL ? "نشط" : "Active", variant: "success" }
            : { label: isRTL ? "غير نشط" : "Inactive", variant: "secondary" }
          }
        />
      ),
    },
  ];

  const actions: DataTableAction<any>[] = [
    {
      label: isRTL ? "عرض" : "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => setViewContact(row),
    },
    {
      label: isRTL ? "تعديل" : "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/client/contacts/${row.id}/edit`),
    },
    {
      label: isRTL ? "حذف" : "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (row) => setDeleteContact(row),
      variant: "destructive",
      separator: true,
    },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "الموردين" : "Vendors"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة بيانات الموردين" : "Manage vendor data"}
        </p>
      </div>

      <DataTable
        title={isRTL ? "قائمة الموردين" : "Vendors List"}
        icon={<Truck className="h-5 w-5 text-primary" />}
        columns={columns}
        data={vendors}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        actions={actions}
        searchPlaceholder={isRTL ? "بحث بالاسم أو الهاتف أو البريد..." : "Search by name, phone or email..."}
        onSearch={(row, term) =>
          row.name.toLowerCase().includes(term) ||
          (row.name_en && row.name_en.toLowerCase().includes(term)) ||
          (row.phone && row.phone.includes(term)) ||
          (row.email && row.email.toLowerCase().includes(term))
        }
        createButton={{
          label: isRTL ? "إضافة مورد" : "Add Vendor",
          onClick: () => navigate("/client/contacts/new?type=vendor"),
        }}
        emptyState={{
          icon: <Truck className="h-10 w-10 text-muted-foreground/60" />,
          title: isRTL ? "لا يوجد موردين بعد" : "No vendors yet",
          description: isRTL ? "ابدأ بإضافة أول مورد" : "Start by adding your first vendor",
          actionLabel: isRTL ? "إضافة مورد" : "Add Vendor",
          onAction: () => navigate("/client/contacts/new?type=vendor"),
        }}
      />

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
