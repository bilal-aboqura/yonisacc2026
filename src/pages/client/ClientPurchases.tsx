import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useRBAC } from "@/hooks/useRBAC";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Eye, Trash2, CreditCard, Undo2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import InvoicePaymentDialog from "@/components/client/InvoicePaymentDialog";
import PurchaseReturnDialog from "@/components/client/PurchaseReturnDialog";



const statusMap = (isRTL: boolean): Record<string, { label: string; variant: any }> => ({
  draft: { label: isRTL ? "مسودة" : "Draft", variant: "secondary" },
  confirmed: { label: isRTL ? "مؤكدة" : "Confirmed", variant: "success" },
  posted: { label: isRTL ? "مؤكدة" : "Confirmed", variant: "success" },
  returned: { label: isRTL ? "مرتجعة" : "Returned", variant: "destructive" },
  partial_return: { label: isRTL ? "مرتجع جزئي" : "Partial Return", variant: "warning" },
});

const paymentMap = (isRTL: boolean): Record<string, { label: string; variant: any }> => ({
  paid: { label: isRTL ? "مدفوعة" : "Paid", variant: "success" },
  unpaid: { label: isRTL ? "غير مدفوعة" : "Unpaid", variant: "destructive" },
  partial: { label: isRTL ? "جزئية" : "Partial", variant: "warning" },
});

const ClientPurchases = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const { can } = useRBAC();
  const queryClient = useQueryClient();

  const [deleteInvoice, setDeleteInvoice] = useState<any>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [returnInvoice, setReturnInvoice] = useState<any>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["purchase-invoices", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, contacts(name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "purchase")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    invoices.forEach((inv: any) => {
      if (inv.invoice_date) years.add(inv.invoice_date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv: any) => {
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterPayment !== "all" && (inv.payment_status || "unpaid") !== filterPayment) return false;
      if (filterYear !== "all" && !inv.invoice_date?.startsWith(filterYear)) return false;
      if (filterMonth !== "all") {
        const month = inv.invoice_date?.substring(5, 7);
        if (month !== filterMonth) return false;
      }
      return true;
    });
  }, [invoices, filterStatus, filterPayment, filterMonth, filterYear]);

  const handleDelete = async () => {
    if (!deleteInvoice) return;
    try {
      const { error } = await (supabase.rpc as any)("reverse_and_delete_invoice", {
        p_invoice_id: deleteInvoice.id,
      });
      if (error) throw error;
      toast.success(isRTL ? "تم حذف الفاتورة وعكس القيود المحاسبية" : "Invoice deleted and journal entries reversed");
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
      queryClient.invalidateQueries({ queryKey: ["general-ledger"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteInvoice(null);
    }
  };

  const sMap = statusMap(isRTL);
  const pMap = paymentMap(isRTL);

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
      key: "vendor",
      header: isRTL ? "المورد" : "Vendor",
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
        const s = pMap[row.payment_status || "unpaid"] || pMap.unpaid;
        return <StatusBadge config={s} />;
      },
    },
    {
      key: "status",
      header: isRTL ? "الحالة" : "Status",
      width: 120,
      render: (row) => {
        const s = sMap[row.status || "draft"] || sMap.draft;
        return <StatusBadge config={s} />;
      },
    },
    {
      key: "actions",
      header: isRTL ? "إجراءات" : "Actions",
      width: 180,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/purchases/${row.id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
          </Tooltip>

          {row.status === "draft" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/purchases/${row.id}/edit`)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
            </Tooltip>
          )}

          {(row.status === "confirmed" || row.status === "posted") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPaymentInvoice(row)}>
                  <CreditCard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? "دفعات" : "Payments"}</TooltipContent>
            </Tooltip>
          )}

          {(row.status === "confirmed" || row.status === "posted") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setReturnInvoice(row)}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? "مرتجع" : "Return"}</TooltipContent>
            </Tooltip>
          )}

          {can("DELETE_PURCHASES") && (
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

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: isRTL
      ? new Date(2000, i).toLocaleDateString("ar-SA", { month: "long" })
      : new Date(2000, i).toLocaleDateString("en-US", { month: "long" }),
  }));

  const totalPurchases = filteredInvoices.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
  const totalPaid = filteredInvoices.reduce((s: number, inv: any) => s + (inv.paid_amount || 0), 0);
  const totalUnpaid = totalPurchases - totalPaid;

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "فواتير المشتريات" : "Purchase Invoices"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة فواتير المشتريات والموردين" : "Manage purchase invoices and vendors"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الفواتير" : "Total Invoices"}</p>
          <p className="text-2xl font-bold">{filteredInvoices.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المشتريات" : "Total Purchases"}</p>
          <p className="text-2xl font-bold">{totalPurchases.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "المدفوع" : "Paid"}</p>
          <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{isRTL ? "المتبقي" : "Outstanding"}</p>
          <p className="text-2xl font-bold text-amber-600">{totalUnpaid.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder={isRTL ? "الحالة" : "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل الحالات" : "All Statuses"}</SelectItem>
            <SelectItem value="draft">{isRTL ? "مسودة" : "Draft"}</SelectItem>
            <SelectItem value="confirmed">{isRTL ? "مؤكدة" : "Confirmed"}</SelectItem>
            <SelectItem value="returned">{isRTL ? "مرتجعة" : "Returned"}</SelectItem>
            <SelectItem value="partial_return">{isRTL ? "مرتجع جزئي" : "Partial Return"}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder={isRTL ? "حالة الدفع" : "Payment"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل حالات الدفع" : "All Payments"}</SelectItem>
            <SelectItem value="paid">{isRTL ? "مدفوعة" : "Paid"}</SelectItem>
            <SelectItem value="unpaid">{isRTL ? "غير مدفوعة" : "Unpaid"}</SelectItem>
            <SelectItem value="partial">{isRTL ? "جزئية" : "Partial"}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={isRTL ? "الشهر" : "Month"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل الأشهر" : "All Months"}</SelectItem>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder={isRTL ? "السنة" : "Year"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل السنوات" : "All Years"}</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterStatus !== "all" || filterPayment !== "all" || filterMonth !== "all" || filterYear !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => { setFilterStatus("all"); setFilterPayment("all"); setFilterMonth("all"); setFilterYear("all"); }}
          >
            {isRTL ? "مسح الفلاتر" : "Clear Filters"}
          </Button>
        )}
      </div>

      <DataTable
        title={isRTL ? "قائمة الفواتير" : "Invoices List"}
        icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        columns={columns}
        data={filteredInvoices}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        searchPlaceholder={isRTL ? "بحث برقم الفاتورة أو اسم المورد..." : "Search by invoice number or vendor..."}
        onSearch={(row, term) =>
          row.invoice_number.toLowerCase().includes(term) ||
          (row.contacts?.name && row.contacts.name.toLowerCase().includes(term))
        }
        createButton={{
          label: isRTL ? "فاتورة جديدة" : "New Invoice",
          onClick: () => navigate("/client/purchases/new"),
        }}
        emptyState={{
          icon: <ShoppingCart className="h-10 w-10 text-muted-foreground/60" />,
          title: isRTL ? "لا توجد فواتير بعد" : "No invoices yet",
          description: isRTL ? "ابدأ بإنشاء أول فاتورة مشتريات" : "Start by creating your first purchase invoice",
          actionLabel: isRTL ? "إنشاء فاتورة" : "Create Invoice",
          onAction: () => navigate("/client/purchases/new"),
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

      {/* Return Dialog */}
      {returnInvoice && (
        <PurchaseReturnDialog
          invoice={returnInvoice}
          open={!!returnInvoice}
          onOpenChange={(open) => !open && setReturnInvoice(null)}
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

export default ClientPurchases;
