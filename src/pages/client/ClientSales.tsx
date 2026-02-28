import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { FileText, Eye, Trash2, CreditCard, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import InvoicePaymentDialog from "@/components/client/InvoicePaymentDialog";

const OWNER_USER_ID = "87740311-8413-47eb-b936-b4c96daecaa5";

const ClientSales = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [deleteInvoice, setDeleteInvoice] = useState<any>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["sales-invoices", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, contacts(name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "sale")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const handleDelete = async () => {
    if (!deleteInvoice) return;
    try {
      await supabase.from("invoice_items").delete().eq("invoice_id", deleteInvoice.id);
      await supabase.from("invoice_payments").delete().eq("invoice_id", deleteInvoice.id);
      const { error } = await supabase.from("invoices").delete().eq("id", deleteInvoice.id);
      if (error) throw error;
      toast.success(isRTL ? "تم حذف الفاتورة" : "Invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteInvoice(null);
    }
  };

  const handleReturn = async (invoice: any) => {
    navigate(`/client/sales/new?return_from=${invoice.id}`);
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "invoice_number",
      header: isRTL ? "رقم الفاتورة" : "Invoice #",
      render: (row) => <span className="font-mono font-semibold text-primary">{row.invoice_number}</span>,
      width: 130,
    },
    {
      key: "invoice_date",
      header: isRTL ? "التاريخ" : "Date",
      render: (row) => row.invoice_date,
      width: 110,
    },
    {
      key: "customer",
      header: isRTL ? "العميل" : "Customer",
      render: (row) => row.contacts ? (isRTL ? row.contacts.name : (row.contacts.name_en || row.contacts.name)) : "-",
    },
    {
      key: "total",
      header: isRTL ? "الإجمالي" : "Total",
      numeric: true,
      render: (row) => (row.total ?? 0).toLocaleString(),
    },
    {
      key: "paid_amount",
      header: isRTL ? "المدفوع" : "Paid",
      numeric: true,
      render: (row) => (row.paid_amount ?? 0).toLocaleString(),
      hideOnMobile: true,
    },
    {
      key: "payment_status",
      header: isRTL ? "حالة الدفع" : "Payment",
      width: 110,
      render: (row) => {
        const map: Record<string, { label: string; variant: any }> = {
          paid: { label: isRTL ? "مدفوعة" : "Paid", variant: "success" },
          unpaid: { label: isRTL ? "غير مدفوعة" : "Unpaid", variant: "destructive" },
          partial: { label: isRTL ? "جزئية" : "Partial", variant: "warning" },
        };
        const s = map[row.payment_status || "unpaid"] || map.unpaid;
        return <StatusBadge config={s} />;
      },
    },
    {
      key: "status",
      header: isRTL ? "الحالة" : "Status",
      width: 100,
      render: (row) => (
        <StatusBadge config={row.status === "posted"
          ? { label: isRTL ? "معتمدة" : "Posted", variant: "success" }
          : { label: isRTL ? "مسودة" : "Draft", variant: "secondary" }
        } />
      ),
    },
    {
      key: "actions",
      header: isRTL ? "إجراءات" : "Actions",
      width: 160,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/sales/${row.id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPaymentInvoice(row)}>
                <CreditCard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "تحصيل دفعات" : "Payments"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReturn(row)}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "مرتجع" : "Return"}</TooltipContent>
          </Tooltip>

          {user?.id === OWNER_USER_ID && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteInvoice(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? "حذف" : "Delete"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "فواتير المبيعات" : "Sales Invoices"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة فواتير المبيعات والعملاء" : "Manage sales invoices and customers"}
        </p>
      </div>

      <DataTable
        title={isRTL ? "قائمة الفواتير" : "Invoices List"}
        icon={<FileText className="h-5 w-5 text-primary" />}
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        searchPlaceholder={isRTL ? "بحث برقم الفاتورة أو اسم العميل..." : "Search by invoice number or customer..."}
        onSearch={(row, term) =>
          row.invoice_number.toLowerCase().includes(term) ||
          (row.contacts?.name && row.contacts.name.toLowerCase().includes(term))
        }
        createButton={{
          label: isRTL ? "فاتورة جديدة" : "New Invoice",
          onClick: () => navigate("/client/sales/new"),
        }}
        emptyState={{
          icon: <FileText className="h-10 w-10 text-muted-foreground/60" />,
          title: isRTL ? "لا توجد فواتير بعد" : "No invoices yet",
          description: isRTL ? "ابدأ بإنشاء أول فاتورة مبيعات" : "Start by creating your first sales invoice",
          actionLabel: isRTL ? "إنشاء فاتورة" : "Create Invoice",
          onAction: () => navigate("/client/sales/new"),
        }}
      />

      {/* Payment Dialog */}
      {paymentInvoice && (
        <InvoicePaymentDialog
          invoice={paymentInvoice}
          open={!!paymentInvoice}
          onOpenChange={(open) => !open && setPaymentInvoice(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={(open) => !open && setDeleteInvoice(null)}>
        <AlertDialogContent className={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف الفاتورة "${deleteInvoice?.invoice_number}"؟ سيتم حذف جميع البيانات المرتبطة.`
                : `Are you sure you want to delete invoice "${deleteInvoice?.invoice_number}"? All related data will be removed.`}
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

export default ClientSales;
