import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { ShoppingCart, Eye, Edit, Trash2 } from "lucide-react";

const ClientPurchases = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();

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
  ];

  const actions: DataTableAction<any>[] = [
    {
      label: isRTL ? "عرض" : "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/client/invoices/${row.id}`),
    },
    {
      label: isRTL ? "تعديل" : "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: () => {},
    },
    {
      label: isRTL ? "حذف" : "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {},
      variant: "destructive",
      separator: true,
    },
  ];

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

      <DataTable
        title={isRTL ? "قائمة الفواتير" : "Invoices List"}
        icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        actions={actions}
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
    </div>
  );
};

export default ClientPurchases;
