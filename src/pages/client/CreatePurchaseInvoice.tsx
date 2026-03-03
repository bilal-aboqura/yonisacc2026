import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Save,
  ShoppingCart,
  Package,
  User,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import UsageLimitGuard from "@/components/client/UsageLimitGuard";

interface Contact {
  id: string;
  name: string;
  name_en: string | null;
  tax_number: string | null;
  address: string | null;
  phone: string | null;
}

interface Product {
  id: string;
  name: string;
  name_en: string | null;
  sku: string | null;
  purchase_price: number | null;
  tax_rate: number | null;
  unit: string | null;
}

interface InvoiceItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  total: number;
}

const CreatePurchaseInvoice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const { incrementUsage } = useFeatureAccess();
  const Arrow = isRTL ? ArrowRight : ArrowLeft;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedVendor, setSelectedVendor] = useState<Contact | null>(null);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [vendorSearch, setVendorSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    try {
      const resolvedId = await (await import("@/hooks/useCompanyId")).fetchCompanyId(user?.id || "");
      if (!resolvedId) throw new Error("No company found");
      setCompanyId(resolvedId);

      // Fetch vendors (suppliers + both)
      const { data: vendorsData } = await supabase
        .from("contacts")
        .select("id, name, name_en, tax_number, address, phone")
        .eq("company_id", resolvedId)
        .in("type", ["vendor", "both"])
        .eq("is_active", true);

      setVendors(vendorsData || []);

      // Fetch products
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, name_en, sku, purchase_price, tax_rate, unit")
        .eq("company_id", resolvedId)
        .eq("is_active", true);

      setProducts(productsData || []);

      // Load existing invoice for editing
      if (isEditMode && editId) {
        const { data: existingInvoice } = await supabase
          .from("invoices")
          .select("*, contacts(id, name, name_en, tax_number, address, phone)")
          .eq("id", editId)
          .eq("company_id", resolvedId)
          .maybeSingle();

        if (existingInvoice) {
          if (existingInvoice.status !== "draft") {
            toast.error(isRTL ? "لا يمكن تعديل فاتورة مؤكدة" : "Cannot edit a confirmed invoice");
            navigate("/client/purchases");
            return;
          }
          setInvoiceNumber(existingInvoice.invoice_number);
          setInvoiceDate(existingInvoice.invoice_date);
          setDueDate(existingInvoice.due_date || "");
          setReferenceNumber(existingInvoice.reference_number || "");
          setNotes(existingInvoice.notes || "");
          if (existingInvoice.contacts) setSelectedVendor(existingInvoice.contacts as any);

          const { data: existingItems } = await supabase
            .from("invoice_items")
            .select("*, product:products(name, name_en)")
            .eq("invoice_id", editId)
            .order("sort_order");

          if (existingItems && existingItems.length > 0) {
            setItems(existingItems.map(item => {
              const pName = isRTL ? item.product?.name : (item.product?.name_en || item.product?.name);
              return {
                id: crypto.randomUUID(),
                product_id: item.product_id,
                product_name: pName || item.description || "",
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percent: item.discount_percent || 0,
                tax_rate: item.tax_rate || 15,
                total: item.total || 0,
              };
            }));
          }
        }
      } else {
        // Generate invoice number from settings
        const { data: settings } = await supabase
          .from("company_settings")
          .select("purchase_prefix, next_purchase_number")
          .eq("company_id", resolvedId)
          .maybeSingle();

        const prefix = settings?.purchase_prefix || "PUR-";
        const nextNum = settings?.next_purchase_number || 1;
        setInvoiceNumber(`${prefix}${String(nextNum).padStart(6, "0")}`);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(isRTL ? "حدث خطأ في تحميل البيانات" : "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (item.tax_rate / 100);
    return afterDiscount + taxAmount;
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          updated.total = calculateItemTotal(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const addProduct = (product: Product) => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: isRTL ? product.name : (product.name_en || product.name),
      quantity: 1,
      unit_price: product.purchase_price || 0,
      discount_percent: 0,
      tax_rate: product.tax_rate || 15,
      total: 0,
    };
    newItem.total = calculateItemTotal(newItem);
    setItems((prev) => [...prev, newItem]);
    setProductDialogOpen(false);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price * (1 - item.discount_percent / 100);
  }, 0);

  const totalTax = items.reduce((sum, item) => {
    const afterDiscount = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
    return sum + afterDiscount * (item.tax_rate / 100);
  }, 0);

  const totalDiscount = items.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price * (item.discount_percent / 100);
  }, 0);

  const grandTotal = subtotal + totalTax;

  const handleSave = async (status: "draft" | "confirmed") => {
    if (!companyId) return;

    if (items.length === 0) {
      toast.error(isRTL ? "يرجى إضافة صنف واحد على الأقل" : "Please add at least one item");
      return;
    }

    setSaving(true);
    try {
      const invoicePayload = {
        company_id: companyId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        reference_number: referenceNumber || null,
        type: "purchase" as const,
        status: status === "confirmed" ? "draft" : status,
        contact_id: selectedVendor?.id || null,
        subtotal: subtotal,
        discount_amount: totalDiscount,
        tax_amount: totalTax,
        total: grandTotal,
        notes: notes || null,
        created_by: user?.id,
      };

      let invoiceId: string;

      if (isEditMode && editId) {
        const { error: updateError } = await supabase
          .from("invoices")
          .update(invoicePayload)
          .eq("id", editId);
        if (updateError) throw updateError;
        invoiceId = editId;

        await supabase.from("invoice_items").delete().eq("invoice_id", editId);
      } else {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .insert(invoicePayload)
          .select()
          .single();
        if (invoiceError) throw invoiceError;
        invoiceId = invoiceData.id;
      }

      const invoiceItems = items.map((item, index) => ({
        invoice_id: invoiceId,
        product_id: item.product_id,
        description: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        discount_amount: item.quantity * item.unit_price * (item.discount_percent / 100),
        tax_rate: item.tax_rate,
        tax_amount: item.quantity * item.unit_price * (1 - item.discount_percent / 100) * (item.tax_rate / 100),
        total: item.total,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemsError) throw itemsError;

      // If confirmed, post via RPC
      if (status === "confirmed") {
        const { data: postResult, error: postError } = await supabase
          .rpc("post_purchase_invoice" as any, {
            p_company_id: companyId,
            p_invoice_id: invoiceId,
          });
        if (postError) throw postError;
      }

      // Increment usage only for new invoices
      if (!isEditMode) {
        await incrementUsage("purchase_invoices");
      }

      toast.success(
        isEditMode
          ? (status === "confirmed"
            ? (isRTL ? "تم تأكيد الفاتورة بنجاح" : "Invoice confirmed successfully")
            : (isRTL ? "تم تحديث الفاتورة" : "Invoice updated"))
          : (status === "draft"
            ? (isRTL ? "تم حفظ الفاتورة كمسودة" : "Invoice saved as draft")
            : (isRTL ? "تم إنشاء وتأكيد الفاتورة بنجاح" : "Invoice created and confirmed"))
      );

      navigate("/client/purchases");
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast.error(error.message || (isRTL ? "حدث خطأ في حفظ الفاتورة" : "Error saving invoice"));
    } finally {
      setSaving(false);
    }
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.name_en?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.name_en?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UsageLimitGuard usageType="purchase_invoices">
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/purchases")}>
            <Arrow className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode
                ? (isRTL ? "تعديل فاتورة مشتريات" : "Edit Purchase Invoice")
                : (isRTL ? "فاتورة مشتريات جديدة" : "New Purchase Invoice")}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? (isRTL ? "تعديل بيانات الفاتورة" : "Edit invoice details")
                : (isRTL ? "إنشاء فاتورة شراء من المورد" : "Create a purchase invoice")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            <Save className="h-4 w-4 me-2" />
            {isRTL ? "حفظ كمسودة" : "Save Draft"}
          </Button>
          <Button onClick={() => handleSave("confirmed")} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <CheckCircle className="h-4 w-4 me-2" />
            {isRTL ? "حفظ وتأكيد" : "Save & Confirm"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {isRTL ? "بيانات الفاتورة" : "Invoice Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "رقم الفاتورة" : "Invoice Number"}</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "رقم المرجع (اختياري)" : "Reference # (optional)"}</Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={isRTL ? "رقم فاتورة المورد" : "Vendor invoice number"}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ الفاتورة" : "Invoice Date"}</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Vendor Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {isRTL ? "بيانات المورد" : "Vendor Details"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVendor ? (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{isRTL ? selectedVendor.name : (selectedVendor.name_en || selectedVendor.name)}</p>
                    {selectedVendor.tax_number && (
                      <p className="text-sm text-muted-foreground">{isRTL ? "الرقم الضريبي:" : "Tax #:"} {selectedVendor.tax_number}</p>
                    )}
                    {selectedVendor.phone && (
                      <p className="text-sm text-muted-foreground">{isRTL ? "الهاتف:" : "Phone:"} {selectedVendor.phone}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedVendor(null)}>
                    {isRTL ? "تغيير" : "Change"}
                  </Button>
                </div>
              ) : (
                <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <Search className="h-4 w-4" />
                      {isRTL ? "اختيار المورد" : "Select Vendor"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{isRTL ? "اختيار المورد" : "Select Vendor"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder={isRTL ? "بحث..." : "Search..."}
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                      />
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {filteredVendors.map((vendor) => (
                          <div
                            key={vendor.id}
                            className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setVendorDialogOpen(false);
                            }}
                          >
                            <p className="font-medium">{isRTL ? vendor.name : (vendor.name_en || vendor.name)}</p>
                            {vendor.tax_number && (
                              <p className="text-sm text-muted-foreground">{vendor.tax_number}</p>
                            )}
                          </div>
                        ))}
                        {filteredVendors.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">
                            {isRTL ? "لا يوجد موردين" : "No vendors found"}
                          </p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {isRTL ? "الأصناف" : "Items"}
              </CardTitle>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {isRTL ? "إضافة صنف" : "Add Item"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{isRTL ? "اختيار صنف" : "Select Product"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder={isRTL ? "بحث..." : "Search..."}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => addProduct(product)}
                        >
                          <div className="flex justify-between">
                            <p className="font-medium">{isRTL ? product.name : (product.name_en || product.name)}</p>
                            <p className="text-primary font-medium">
                              {(product.purchase_price || 0).toFixed(2)} {isRTL ? "ر.س" : "SAR"}
                            </p>
                          </div>
                          {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          {isRTL ? "لا توجد أصناف" : "No products found"}
                        </p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{isRTL ? "لم تتم إضافة أصناف بعد" : "No items added yet"}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
                      <TableHead className="w-20">{isRTL ? "الكمية" : "Qty"}</TableHead>
                      <TableHead className="w-28">{isRTL ? "السعر" : "Price"}</TableHead>
                      <TableHead className="w-20">{isRTL ? "خصم %" : "Disc %"}</TableHead>
                      <TableHead className="w-20">{isRTL ? "ضريبة %" : "Tax %"}</TableHead>
                      <TableHead className="w-28">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value))}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount_percent}
                            onChange={(e) => updateItem(item.id, "discount_percent", Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(item.id, "tax_rate", Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.total.toFixed(2)} {isRTL ? "ر.س" : "SAR"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "ملاحظات" : "Notes"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRTL ? "ملاحظات إضافية على الفاتورة..." : "Additional notes..."}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>{isRTL ? "ملخص الفاتورة" : "Invoice Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "المجموع الفرعي" : "Subtotal"}</span>
                <span>{subtotal.toFixed(2)} {isRTL ? "ر.س" : "SAR"}</span>
              </div>
              <div className="flex justify-between text-sm text-destructive">
                <span>{isRTL ? "الخصم" : "Discount"}</span>
                <span>- {totalDiscount.toFixed(2)} {isRTL ? "ر.س" : "SAR"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "ضريبة القيمة المضافة" : "VAT"}</span>
                <span>{totalTax.toFixed(2)} {isRTL ? "ر.س" : "SAR"}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>{isRTL ? "الإجمالي" : "Total"}</span>
                <span className="text-primary">{grandTotal.toFixed(2)} {isRTL ? "ر.س" : "SAR"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </UsageLimitGuard>
  );
};

export default CreatePurchaseInvoice;
