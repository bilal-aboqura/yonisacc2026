import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, Undo2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReturnItem {
  id: string;
  description: string | null;
  quantity: number;
  max_quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  selected: boolean;
  product_name?: string;
}

interface PurchaseReturnDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PurchaseReturnDialog = ({ invoice, open, onOpenChange }: PurchaseReturnDialogProps) => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      fetchInvoiceItems();
    }
  }, [open, invoice]);

  const fetchInvoiceItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*, product:products(name, name_en)")
        .eq("invoice_id", invoice.id)
        .order("sort_order");

      if (error) throw error;

      setItems(
        (data || []).map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          max_quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          tax_amount: item.tax_amount || 0,
          total: item.total || 0,
          selected: false,
          product_name: isRTL ? item.product?.name : (item.product?.name_en || item.product?.name),
        }))
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    const newItems = [...items];
    newItems[index].selected = !newItems[index].selected;
    if (!newItems[index].selected) {
      newItems[index].quantity = newItems[index].max_quantity;
    }
    setItems(newItems);
  };

  const updateQuantity = (index: number, qty: number) => {
    const newItems = [...items];
    const maxQty = newItems[index].max_quantity;
    const validQty = Math.max(0.01, Math.min(qty, maxQty));
    newItems[index].quantity = validQty;

    const subtotal = validQty * newItems[index].unit_price;
    newItems[index].tax_amount = (subtotal * newItems[index].tax_rate) / 100;
    newItems[index].total = subtotal + newItems[index].tax_amount;
    setItems(newItems);
  };

  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);

  const returnTotals = useMemo(() => {
    const subtotal = selectedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const tax = selectedItems.reduce((s, i) => s + i.tax_amount, 0);
    const total = selectedItems.reduce((s, i) => s + i.total, 0);
    return { subtotal, tax, total };
  }, [selectedItems]);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error(isRTL ? "يرجى اختيار صنف واحد على الأقل" : "Please select at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const returnItems = selectedItems.map((item) => ({
        invoice_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        total: item.total,
      }));

      const { data, error } = await (supabase.rpc as any)("return_purchase_invoice", {
        p_company_id: companyId,
        p_invoice_id: invoice.id,
        p_return_items: returnItems,
      });

      if (error) throw error;

      toast.success(
        isRTL
          ? `تم إنشاء المرتجع بنجاح - قيد رقم: ${data.journal_entry_number}`
          : `Return created - Journal: ${data.journal_entry_number}`
      );

      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || (isRTL ? "خطأ في إنشاء المرتجع" : "Error creating return"));
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-3xl max-h-[90vh] overflow-y-auto ${isRTL ? "rtl" : "ltr"}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-destructive" />
            {isRTL ? "مرتجع مشتريات" : "Purchase Return"}
          </DialogTitle>
        </DialogHeader>

        {invoice && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "رقم الفاتورة" : "Invoice #"}</p>
              <p className="font-mono font-semibold text-sm">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</p>
              <p className="text-sm">{invoice.invoice_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "المورد" : "Vendor"}</p>
              <p className="text-sm">{invoice.contacts ? (isRTL ? invoice.contacts.name : (invoice.contacts.name_en || invoice.contacts.name)) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p>
              <p className="font-semibold text-sm">{fmt(invoice.total || 0)}</p>
            </div>
          </div>
        )}

        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "اختر الأصناف والكميات المراد إرجاعها:" : "Select items and quantities to return:"}
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
                    <TableHead className="text-center w-24">{isRTL ? "الكمية المرتجعة" : "Return Qty"}</TableHead>
                    <TableHead className="text-center w-20">{isRTL ? "الأصلية" : "Original"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "السعر" : "Price"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "الضريبة" : "Tax"}</TableHead>
                    <TableHead className="text-center">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} className={item.selected ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItem(index)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm">
                          {item.product_name || item.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0.01}
                          max={item.max_quantity}
                          step={1}
                          value={item.selected ? item.quantity : ""}
                          disabled={!item.selected}
                          onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                          className="h-8 text-center w-20"
                        />
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {item.max_quantity}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {fmt(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {item.selected ? fmt(item.tax_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-sm tabular-nums">
                        {item.selected ? fmt(item.total) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedItems.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <Undo2 className="h-3.5 w-3.5" />
                  {isRTL ? "ملخص المرتجع" : "Return Summary"}
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{isRTL ? "المبلغ قبل الضريبة" : "Subtotal"}</p>
                    <p className="font-semibold tabular-nums">{fmt(returnTotals.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{isRTL ? "الضريبة" : "Tax"}</p>
                    <p className="font-semibold tabular-nums">{fmt(returnTotals.tax)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{isRTL ? "إجمالي المرتجع" : "Return Total"}</p>
                    <p className="font-bold text-destructive tabular-nums">{fmt(returnTotals.total)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || selectedItems.length === 0}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <Undo2 className="h-4 w-4" />
            {isRTL ? "تنفيذ المرتجع" : "Process Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseReturnDialog;
