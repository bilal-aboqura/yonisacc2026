import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useState } from "react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { FileText, Eye, Edit, Trash2, ArrowRightLeft, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

const Quotes = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { incrementUsage } = useFeatureAccess();

  const [deleteQuote, setDeleteQuote] = useState<any>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

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
      // Delete items first
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

  const handleConvertToInvoice = async (quote: any) => {
    if (!companyId || !user) return;
    setConvertingId(quote.id);

    try {
      // 1. Fetch quote items
      const { data: quoteItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", quote.id)
        .order("sort_order");

      if (itemsError) throw itemsError;

      // 2. Generate invoice number
      const { data: settings } = await supabase
        .from("company_settings")
        .select("invoice_prefix, next_invoice_number")
        .eq("company_id", companyId)
        .maybeSingle();

      const prefix = settings?.invoice_prefix || "INV-";
      const nextNum = settings?.next_invoice_number || 1;
      const invoiceNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;

      // 3. Create sales invoice from quote data
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          contact_id: quote.contact_id,
          type: "sale",
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: quote.due_date,
          subtotal: quote.subtotal,
          discount_amount: quote.discount_amount,
          tax_amount: quote.tax_amount,
          total: quote.total,
          status: "draft",
          reference_number: quote.invoice_number, // Link to quote number
          notes: quote.notes
            ? `${quote.notes}\n${isRTL ? "محوّل من عرض سعر:" : "Converted from quote:"} ${quote.invoice_number}`
            : `${isRTL ? "محوّل من عرض سعر:" : "Converted from quote:"} ${quote.invoice_number}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 4. Copy items to new invoice
      if (quoteItems && quoteItems.length > 0) {
        const newItems = quoteItems.map(item => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          total: item.total,
          sort_order: item.sort_order,
        }));

        const { error: copyError } = await supabase.from("invoice_items").insert(newItems);
        if (copyError) throw copyError;
      }

      // 5. Mark quote as converted
      await supabase.from("invoices").update({ status: "converted" }).eq("id", quote.id);

      // 6. Increment next_invoice_number
      await supabase.from("company_settings")
        .update({ next_invoice_number: nextNum + 1 })
        .eq("company_id", companyId);

      // 7. Increment usage
      await incrementUsage("sales_invoices");

      toast.success(isRTL ? "تم تحويل عرض السعر إلى فاتورة مبيعات بنجاح" : "Quote converted to sales invoice");

      queryClient.invalidateQueries({ queryKey: ["quotes"] });

      // Navigate to the new invoice
      navigate(`/client/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error("Convert error:", error);
      toast.error(error.message || (isRTL ? "خطأ في التحويل" : "Conversion failed"));
    } finally {
      setConvertingId(null);
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
      width: 110,
      render: (row) => {
        const map: Record<string, { label: string; variant: any }> = {
          draft: { label: isRTL ? "مسودة" : "Draft", variant: "secondary" },
          sent: { label: isRTL ? "مرسل" : "Sent", variant: "info" },
          accepted: { label: isRTL ? "مقبول" : "Accepted", variant: "success" },
          rejected: { label: isRTL ? "مرفوض" : "Rejected", variant: "destructive" },
          converted: { label: isRTL ? "محوّل لفاتورة" : "Converted", variant: "default" },
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
      label: isRTL ? "تحويل لفاتورة مبيعات" : "Convert to Sales Invoice",
      icon: convertingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />,
      onClick: (row) => {
        if (row.status === "converted") {
          toast.info(isRTL ? "تم تحويل هذا العرض مسبقاً" : "This quote was already converted");
          return;
        }
        handleConvertToInvoice(row);
      },
    },
    {
      label: isRTL ? "حذف" : "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (row) => {
        if (row.status === "converted") {
          toast.info(isRTL ? "لا يمكن حذف عرض سعر محوّل" : "Cannot delete a converted quote");
          return;
        }
        setDeleteQuote(row);
      },
      variant: "destructive",
      separator: true,
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
