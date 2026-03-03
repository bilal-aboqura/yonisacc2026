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

const PurchaseOrders = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [deleteOrder, setDeleteOrder] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, contacts(name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "purchase_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const handleDelete = async () => {
    if (!deleteOrder) return;
    try {
      await supabase.from("invoice_items").delete().eq("invoice_id", deleteOrder.id);
      const { error } = await supabase.from("invoices").delete().eq("id", deleteOrder.id);
      if (error) throw error;
      toast.success(isRTL ? "تم حذف أمر الشراء" : "Purchase order deleted");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (error: any) {
      toast.error(error.message || (isRTL ? "خطأ في الحذف" : "Delete failed"));
    } finally {
      setDeleteOrder(null);
    }
  };

  const handleMarkReceived = async (order: any) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "received" })
        .eq("id", order.id);
      if (error) throw error;
      toast.success(isRTL ? "تم تحديث الحالة إلى مستلم" : "Order marked as received");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (error: any) {
      toast.error(error.message || (isRTL ? "خطأ في التحديث" : "Update failed"));
    }
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "invoice_number",
      header: isRTL ? "رقم الأمر" : "Order #",
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
      render: (row) => `${(row.total ?? 0).toLocaleString()} ر.س`,
    },
    {
      key: "due_date",
      header: isRTL ? "تاريخ التسليم" : "Delivery Date",
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
          confirmed: { label: isRTL ? "مؤكد" : "Confirmed", variant: "info" },
          received: { label: isRTL ? "مستلم" : "Received", variant: "success" },
          cancelled: { label: isRTL ? "ملغي" : "Cancelled", variant: "destructive" },
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/client/purchase-orders/${row.id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                disabled={row.status === "converted"}
                onClick={() => navigate(`/client/purchase-orders/${row.id}/edit`)}>
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                disabled={row.status === "converted" || row.status === "received"}
                onClick={() => handleMarkReceived(row)}>
                <CheckCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "تم الاستلام" : "Received"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                disabled={row.status === "converted"}
                onClick={() => {
                  if (row.status === "converted") {
                    toast.info(isRTL ? "تم تحويل هذا الأمر مسبقاً" : "Already converted");
                    return;
                  }
                  navigate(`/client/purchases/new?from_po=${row.id}`);
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
                    toast.error(isRTL ? "لا يمكن حذف أمر شراء تم تحويله لفاتورة" : "Cannot delete a converted order");
                    return;
                  }
                  setDeleteOrder(row);
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
          {isRTL ? "أوامر الشراء" : "Purchase Orders"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إدارة أوامر الشراء من الموردين" : "Manage purchase orders from vendors"}
        </p>
      </div>

      <DataTable
        title={isRTL ? "قائمة أوامر الشراء" : "Purchase Orders List"}
        icon={<FileText className="h-5 w-5 text-primary" />}
        columns={columns}
        data={orders}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        searchPlaceholder={isRTL ? "بحث برقم الأمر أو اسم المورد..." : "Search by order number or vendor..."}
        onSearch={(row, term) =>
          row.invoice_number.toLowerCase().includes(term) ||
          (row.contacts?.name && row.contacts.name.toLowerCase().includes(term))
        }
        createButton={{
          label: isRTL ? "أمر شراء جديد" : "New Purchase Order",
          onClick: () => navigate("/client/purchase-orders/new"),
        }}
        emptyState={{
          icon: <FileText className="h-10 w-10 text-muted-foreground/60" />,
          title: isRTL ? "لا توجد أوامر شراء بعد" : "No purchase orders yet",
          description: isRTL ? "ابدأ بإنشاء أول أمر شراء" : "Start by creating your first purchase order",
          actionLabel: isRTL ? "إنشاء أمر شراء" : "Create Purchase Order",
          onAction: () => navigate("/client/purchase-orders/new"),
        }}
      />

      <AlertDialog open={!!deleteOrder} onOpenChange={(open) => !open && setDeleteOrder(null)}>
        <AlertDialogContent className={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف أمر الشراء "${deleteOrder?.invoice_number}"؟`
                : `Are you sure you want to delete purchase order "${deleteOrder?.invoice_number}"?`}
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

export default PurchaseOrders;
