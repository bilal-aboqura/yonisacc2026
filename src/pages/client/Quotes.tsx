import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { FileText, Eye, Edit, Trash2, ArrowRightLeft } from "lucide-react";

const Quotes = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, contacts(name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "quote")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const columns: DataTableColumn<any>[] = [
    {
      key: "invoice_number",
      header: isRTL ? "رقم العرض" : "Quote #",
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
      key: "status",
      header: isRTL ? "الحالة" : "Status",
      width: 110,
      render: (row) => {
        const map: Record<string, { label: string; variant: any }> = {
          draft: { label: isRTL ? "مسودة" : "Draft", variant: "secondary" },
          sent: { label: isRTL ? "مرسل" : "Sent", variant: "info" },
          accepted: { label: isRTL ? "مقبول" : "Accepted", variant: "success" },
          rejected: { label: isRTL ? "مرفوض" : "Rejected", variant: "destructive" },
          converted: { label: isRTL ? "محوّل" : "Converted", variant: "default" },
        };
        const s = map[row.status || "draft"] || map.draft;
        return <StatusBadge config={s} />;
      },
    },
  ];

  const actions: DataTableAction<any>[] = [
    {
      label: isRTL ? "عرض" : "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/client/invoices/${row.id}`),
    },
    {
      label: isRTL ? "تحويل لفاتورة" : "Convert to Invoice",
      icon: <ArrowRightLeft className="h-4 w-4" />,
      onClick: () => {},
    },
    {
      label: isRTL ? "تعديل" : "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: () => {},
      separator: true,
    },
    {
      label: isRTL ? "حذف" : "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {},
      variant: "destructive",
    },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "عروض الأسعار" : "Quotations"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة عروض الأسعار للعملاء" : "Manage customer quotations"}
        </p>
      </div>

      <DataTable
        title={isRTL ? "قائمة عروض الأسعار" : "Quotes List"}
        icon={<FileText className="h-5 w-5 text-primary" />}
        columns={columns}
        data={quotes}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        actions={actions}
        searchPlaceholder={isRTL ? "بحث برقم العرض أو اسم العميل..." : "Search by quote number or customer..."}
        onSearch={(row, term) =>
          row.invoice_number.toLowerCase().includes(term) ||
          (row.contacts?.name && row.contacts.name.toLowerCase().includes(term))
        }
        createButton={{
          label: isRTL ? "عرض سعر جديد" : "New Quote",
          onClick: () => navigate("/client/quotes/new"),
        }}
        emptyState={{
          icon: <FileText className="h-10 w-10 text-muted-foreground/60" />,
          title: isRTL ? "لا توجد عروض أسعار بعد" : "No quotes yet",
          description: isRTL ? "ابدأ بإنشاء أول عرض سعر" : "Start by creating your first quote",
          actionLabel: isRTL ? "إنشاء عرض سعر" : "Create Quote",
          onAction: () => navigate("/client/quotes/new"),
        }}
      />
    </div>
  );
};

export default Quotes;
