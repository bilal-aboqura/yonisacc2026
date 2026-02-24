import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Trash2,
  Search,
  Save,
  ShoppingCart,
  Package,
  User,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
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
  const { incrementUsage } = useFeatureAccess();

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
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (companyError) throw companyError;
      setCompanyId(companyData.id);

      // Fetch vendors (suppliers)
      const { data: vendorsData } = await supabase
        .from("contacts")
        .select("id, name, name_en, tax_number, address, phone")
        .eq("company_id", companyData.id)
        .eq("type", "vendor")
        .eq("is_active", true);

      setVendors(vendorsData || []);

      // Fetch products
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, name_en, sku, purchase_price, tax_rate, unit")
        .eq("company_id", companyData.id)
        .eq("is_active", true);

      setProducts(productsData || []);

      // Generate invoice number
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyData.id)
        .eq("type", "purchase");

      setInvoiceNumber(`PUR-${String((count || 0) + 1).padStart(6, "0")}`);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
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
      product_name: product.name,
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
      toast({
        title: "خطأ",
        description: "يرجى إضافة صنف واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          reference_number: referenceNumber || null,
          type: "purchase",
          status,
          contact_id: selectedVendor?.id || null,
          subtotal: subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = items.map((item, index) => ({
        invoice_id: invoiceData.id,
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

      // Increment usage counter
      await incrementUsage("purchase_invoices");

      toast({
        title: "تم الحفظ",
        description: status === "draft" ? "تم حفظ الفاتورة كمسودة" : "تم حفظ الفاتورة بنجاح",
      });

      navigate("/client/purchases");
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ الفاتورة",
        variant: "destructive",
      });
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
    <div className="space-y-6 rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/purchases")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">فاتورة مشتريات جديدة</h1>
            <p className="text-muted-foreground">إنشاء فاتورة شراء من المورد</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            حفظ كمسودة
          </Button>
          <Button onClick={() => handleSave("confirmed")} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            <Save className="h-4 w-4 ml-2" />
            حفظ الفاتورة
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
                بيانات الفاتورة
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الفاتورة</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>رقم المرجع (اختياري)</Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="رقم فاتورة المورد"
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الفاتورة</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الاستحقاق</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Vendor Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                بيانات المورد
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVendor ? (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{selectedVendor.name}</p>
                    {selectedVendor.tax_number && (
                      <p className="text-sm text-muted-foreground">الرقم الضريبي: {selectedVendor.tax_number}</p>
                    )}
                    {selectedVendor.phone && (
                      <p className="text-sm text-muted-foreground">الهاتف: {selectedVendor.phone}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedVendor(null)}>
                    تغيير
                  </Button>
                </div>
              ) : (
                <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <Search className="h-4 w-4" />
                      اختيار المورد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>اختيار المورد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="بحث..."
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
                            <p className="font-medium">{vendor.name}</p>
                            {vendor.tax_number && (
                              <p className="text-sm text-muted-foreground">{vendor.tax_number}</p>
                            )}
                          </div>
                        ))}
                        {filteredVendors.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">لا يوجد موردين</p>
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
                الأصناف
              </CardTitle>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة صنف
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>اختيار صنف</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="بحث..."
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
                            <p className="font-medium">{product.name}</p>
                            <p className="text-primary font-medium">
                              {(product.purchase_price || 0).toFixed(2)} ر.س
                            </p>
                          </div>
                          {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">لا توجد أصناف</p>
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
                  <p>لم تتم إضافة أصناف بعد</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصنف</TableHead>
                      <TableHead className="w-20">الكمية</TableHead>
                      <TableHead className="w-28">السعر</TableHead>
                      <TableHead className="w-20">خصم %</TableHead>
                      <TableHead className="w-20">ضريبة %</TableHead>
                      <TableHead className="w-28">الإجمالي</TableHead>
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
                        <TableCell className="font-medium">{item.total.toFixed(2)} ر.س</TableCell>
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
              <CardTitle>ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية على الفاتورة..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>ملخص الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span>{subtotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-sm text-destructive">
                <span>الخصم</span>
                <span>- {totalDiscount.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ضريبة القيمة المضافة</span>
                <span>{totalTax.toFixed(2)} ر.س</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي</span>
                <span className="text-primary">{grandTotal.toFixed(2)} ر.س</span>
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
