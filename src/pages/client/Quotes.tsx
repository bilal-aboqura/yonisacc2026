import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useState } from "react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { FileText, Eye, Edit, Trash2, ArrowRightLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Quotes = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [deleteQuote, setDeleteQuote] = useState<any>(null);

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

  const handleDelete = async () => {
    if (!deleteQuote) return;
    try {
      await supabase.from("invoice_items").delete().eq("invoice_id", deleteQuote.id);
      const { error } = await supabase.from("invoices").delete().eq("id", deleteQuote.id);
      if (error) throw error;
      toast.success(isRTL ? "تم حذف عرض السعر" : "Quote deleted");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    } catch (error: any) {
      toast.error(error.message || (isRTL ? "خطأ في الحذف" : "Delete failed"));
    } finally {
      setDeleteQuote(null);
    }
  };

  const handleMarkDelivered = async (quote: any) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "delivered" })
        .eq("id", quote.id);
      if (error) throw error;
      toast.success(isRTL ? "تم تحديث الحالة إلى تم التسليم" : "Quote marked as delivered");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    } catch (error: any) {
      toast.error(error.message || (isRTL ? "خطأ في التحديث" : "Update failed"));
    }
  };

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
      render: (row) => `${(row.total ?? 0).toLocaleString()} ر.س`,
    },
    {
      key: "due_date",
      header: isRTL ? "صالح حتى" : "Valid Until",
      render: (row) => row.due_date || "-",
      hideOnMobile: true,
    },
    {
      key: "status",
      header: isRTL ? "الحالة" : "Status",
      width: 120,
      render: (row) => {
        const map: Record<string, { label: string; variant: any }> = {
          draft: { label: isRTL ? "مسودة" : "Draft", variant: "secondary" },
          sent: { label: isRTL ? "مرسل" : "Sent", variant: "info" },
          accepted: { label: isRTL ? "مقبول" : "Accepted", variant: "success" },
          rejected: { label: isRTL ? "مرفوض" : "Rejected", variant: "destructive" },
          delivered: { label: isRTL ? "تم التسليم" : "Delivered", variant: "success" },
          converted: { label: isRTL ? "محوّل لفاتورة" : "Converted", variant: "default" },
        };
        const s = map[row.status || "draft"] || map.draft;
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/quotes/${row.id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                disabled={row.status === "converted"}
                onClick={() => navigate(`/client/quotes/${row.id}/edit`)}>
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                disabled={row.status === "converted" || row.status === "delivered"}
                onClick={() => handleMarkDelivered(row)}>
                <CheckCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "تم التسليم" : "Delivered"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                disabled={row.status === "converted"}
                onClick={() => {
                  if (row.status === "converted") {
                    toast.info(isRTL ? "تم تحويل هذا العرض مسبقاً" : "Already converted");
                    return;
                  }
                  navigate(`/client/sales/new?from_quote=${row.id}`);
                }}>
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "تحويل لفاتورة" : "Convert to Invoice"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={row.status === "converted"}
                onClick={() => {
                  if (row.status === "converted") {
                    toast.error(isRTL ? "لا يمكن حذف عرض سعر تم تحويله لفاتورة" : "Cannot delete a converted quote");
                    return;
                  }
                  setDeleteQuote(row);
                }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "حذف" : "Delete"}</TooltipContent>
          </Tooltip>
        </div>
      ),
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

      <AlertDialog open={!!deleteQuote} onOpenChange={(open) => !open && setDeleteQuote(null)}>
        <AlertDialogContent className={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف عرض السعر "${deleteQuote?.invoice_number}"؟`
                : `Are you sure you want to delete quote "${deleteQuote?.invoice_number}"?`}
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

export default Quotes;
