import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Printer,
  FileText,
  User,
  Calendar,
  Hash,
  Loader2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import UsageLimitGuard from "@/components/client/UsageLimitGuard";

interface Contact {
  id: string;
  name: string;
  name_en: string | null;
  phone: string | null;
  tax_number: string | null;
  address: string | null;
}

interface Product {
  id: string;
  name: string;
  name_en: string | null;
  sku: string | null;
  sale_price: number;
  tax_rate: number;
  unit: string;
}

interface InvoiceItem {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

interface CompanyInfo {
  id: string;
  name: string;
  name_en: string | null;
  tax_number: string | null;
  commercial_register: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const CreateSalesInvoice = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const Arrow = isRTL ? ArrowRight : ArrowLeft;
  const { incrementUsage } = useFeatureAccess();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Invoice data
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: crypto.randomUUID(),
      product_id: null,
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      tax_rate: 15,
      tax_amount: 0,
      total: 0,
    },
  ]);

  // Fetch company and data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch company (supports both owners and team members)
        const resolvedId = await (await import("@/hooks/useCompanyId")).fetchCompanyId(user.id);
        if (!resolvedId) {
          setIsLoading(false);
          return;
        }

        const { data: companyData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", resolvedId)
          .maybeSingle();

        if (companyData) {
          setCompany(companyData);

          // Generate invoice number
          const { count } = await supabase
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyData.id)
            .eq("type", "sale");

          const nextNumber = (count || 0) + 1;
          setInvoiceNumber(`INV-${String(nextNumber).padStart(6, "0")}`);

          // Fetch contacts (customers)
          const { data: contactsData } = await supabase
            .from("contacts")
            .select("id, name, name_en, phone, tax_number, address")
            .eq("company_id", companyData.id)
            .in("type", ["customer", "both"])
            .eq("is_active", true);

          setContacts(contactsData || []);

          // Fetch products
          const { data: productsData } = await supabase
            .from("products")
            .select("id, name, name_en, sku, sale_price, tax_rate, unit")
            .eq("company_id", companyData.id)
            .eq("is_active", true);

          setProducts(productsData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error(isRTL ? "خطأ في تحميل البيانات" : "Error loading data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isRTL]);

  // Calculate item totals
  const calculateItemTotals = (item: InvoiceItem): InvoiceItem => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = item.discount_percent > 0 
      ? (subtotal * item.discount_percent) / 100 
      : item.discount_amount;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * item.tax_rate) / 100;
    const total = taxableAmount + taxAmount;

    return {
      ...item,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total,
    };
  };

  // Update item
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index] = calculateItemTotals(newItems[index]);
    setItems(newItems);
  };

  // Add new item
  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        product_id: null,
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: 15,
        tax_amount: 0,
        total: 0,
      },
    ]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Select product for item
  const selectProduct = (product: Product) => {
    if (selectedItemIndex !== null) {
      const newItems = [...items];
      newItems[selectedItemIndex] = calculateItemTotals({
        ...newItems[selectedItemIndex],
        product_id: product.id,
        description: isRTL ? product.name : (product.name_en || product.name),
        unit_price: product.sale_price,
        tax_rate: product.tax_rate,
      });
      setItems(newItems);
    }
    setProductDialogOpen(false);
    setProductSearch("");
  };

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);

    return { subtotal, totalDiscount, totalTax, total };
  }, [items]);

  // Save invoice
  const handleSave = async (status: "draft" | "confirmed" = "draft") => {
    if (!company) {
      toast.error(isRTL ? "لم يتم العثور على بيانات الشركة" : "Company data not found");
      return;
    }

    if (!selectedContact) {
      toast.error(isRTL ? "يرجى اختيار العميل" : "Please select a customer");
      return;
    }

    if (items.every(item => !item.description)) {
      toast.error(isRTL ? "يرجى إضافة منتج واحد على الأقل" : "Please add at least one product");
      return;
    }

    setIsSaving(true);

    try {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          company_id: company.id,
          contact_id: selectedContact.id,
          type: "sale",
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          subtotal: totals.subtotal,
          discount_amount: totals.totalDiscount,
          tax_amount: totals.totalTax,
          total: totals.total,
          status,
          notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items
        .filter(item => item.description)
        .map((item, index) => ({
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
          sort_order: index,
        }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Increment usage counter
      await incrementUsage("sales_invoices");

      toast.success(
        status === "draft"
          ? (isRTL ? "تم حفظ الفاتورة كمسودة" : "Invoice saved as draft")
          : (isRTL ? "تم إنشاء الفاتورة بنجاح" : "Invoice created successfully")
      );

      navigate("/client/sales");
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast.error(error.message || (isRTL ? "خطأ في حفظ الفاتورة" : "Error saving invoice"));
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered contacts
  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone?.includes(contactSearch) ||
      c.tax_number?.includes(contactSearch)
  );

  // Filtered products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UsageLimitGuard usageType="sales_invoices">
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/sales")}>
            <Arrow className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isRTL ? "فاتورة مبيعات جديدة" : "New Sales Invoice"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isRTL ? "متوافقة مع هيئة الزكاة والدخل" : "ZATCA Compliant"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={isSaving}>
            <Save className="h-4 w-4 me-2" />
            {isRTL ? "حفظ كمسودة" : "Save Draft"}
          </Button>
          <Button onClick={() => handleSave("confirmed")} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 me-2" />
            )}
            {isRTL ? "إنشاء الفاتورة" : "Create Invoice"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company & Customer Info */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Seller Info (Company) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {isRTL ? "بيانات البائع" : "Seller Info"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold">{company?.name}</p>
                {company?.tax_number && (
                  <p className="text-muted-foreground">
                    {isRTL ? "الرقم الضريبي:" : "VAT No:"} {company.tax_number}
                  </p>
                )}
                {company?.commercial_register && (
                  <p className="text-muted-foreground">
                    {isRTL ? "السجل التجاري:" : "CR:"} {company.commercial_register}
                  </p>
                )}
                {company?.address && (
                  <p className="text-muted-foreground">{company.address}</p>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {isRTL ? "بيانات العميل" : "Customer Info"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedContact ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{selectedContact.name}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setContactDialogOpen(true)}
                      >
                        {isRTL ? "تغيير" : "Change"}
                      </Button>
                    </div>
                    {selectedContact.tax_number && (
                      <p className="text-muted-foreground">
                        {isRTL ? "الرقم الضريبي:" : "VAT No:"} {selectedContact.tax_number}
                      </p>
                    )}
                    {selectedContact.phone && (
                      <p className="text-muted-foreground">{selectedContact.phone}</p>
                    )}
                    {selectedContact.address && (
                      <p className="text-muted-foreground">{selectedContact.address}</p>
                    )}
                  </div>
                ) : (
                  <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <User className="h-4 w-4 me-2" />
                        {isRTL ? "اختر العميل" : "Select Customer"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{isRTL ? "اختيار العميل" : "Select Customer"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={isRTL ? "بحث..." : "Search..."}
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            className="ps-10"
                          />
                        </div>
                        <div className="max-h-64 overflow-auto space-y-2">
                          {filteredContacts.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">
                              {isRTL ? "لا يوجد عملاء" : "No customers found"}
                            </p>
                          ) : (
                            filteredContacts.map((contact) => (
                              <div
                                key={contact.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setContactDialogOpen(false);
                                  setContactSearch("");
                                }}
                              >
                                <p className="font-medium">{contact.name}</p>
                                {contact.phone && (
                                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "بيانات الفاتورة" : "Invoice Details"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {isRTL ? "رقم الفاتورة" : "Invoice No."}
                  </Label>
                  <Input value={invoiceNumber} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {isRTL ? "تاريخ الفاتورة" : "Invoice Date"}
                  </Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "نوع الفاتورة" : "Invoice Type"}</Label>
                  <Select defaultValue="tax">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tax">{isRTL ? "فاتورة ضريبية" : "Tax Invoice"}</SelectItem>
                      <SelectItem value="simplified">{isRTL ? "فاتورة مبسطة" : "Simplified Invoice"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{isRTL ? "بنود الفاتورة" : "Invoice Items"}</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 me-1" />
                  {isRTL ? "إضافة بند" : "Add Item"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[200px]">{isRTL ? "الوصف" : "Description"}</TableHead>
                    <TableHead className="w-24">{isRTL ? "الكمية" : "Qty"}</TableHead>
                    <TableHead className="w-28">{isRTL ? "السعر" : "Price"}</TableHead>
                    <TableHead className="w-24">{isRTL ? "الخصم %" : "Disc %"}</TableHead>
                    <TableHead className="w-24">{isRTL ? "الضريبة %" : "VAT %"}</TableHead>
                    <TableHead className="w-28">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder={isRTL ? "وصف المنتج" : "Product description"}
                          />
                          <Dialog open={productDialogOpen && selectedItemIndex === index} onOpenChange={(open) => {
                            setProductDialogOpen(open);
                            if (open) setSelectedItemIndex(index);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon">
                                <Search className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{isRTL ? "اختيار منتج" : "Select Product"}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="relative">
                                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder={isRTL ? "بحث..." : "Search..."}
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="ps-10"
                                  />
                                </div>
                                <div className="max-h-64 overflow-auto space-y-2">
                                  {filteredProducts.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">
                                      {isRTL ? "لا توجد منتجات" : "No products found"}
                                    </p>
                                  ) : (
                                    filteredProducts.map((product) => (
                                      <div
                                        key={product.id}
                                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => selectProduct(product)}
                                      >
                                        <div className="flex justify-between">
                                          <p className="font-medium">{isRTL ? product.name : (product.name_en || product.name)}</p>
                                          <p className="font-semibold text-primary">{product.sale_price} ر.س</p>
                                        </div>
                                        {product.sku && (
                                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) => updateItem(index, "discount_percent", parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.tax_rate}
                          onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.total.toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "ملاحظات" : "Notes"}</CardTitle>
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

        {/* Totals Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "ملخص الفاتورة" : "Invoice Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isRTL ? "المجموع الفرعي" : "Subtotal"}
                  </span>
                  <span>{totals.subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isRTL ? "الخصم" : "Discount"}
                  </span>
                  <span className="text-destructive">-{totals.totalDiscount.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isRTL ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}
                  </span>
                  <span>{totals.totalTax.toFixed(2)} ر.س</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{isRTL ? "الإجمالي" : "Total"}</span>
                    <span className="text-primary">{totals.total.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>

              {/* ZATCA Notice */}
              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-1">
                  {isRTL ? "متطلبات هيئة الزكاة والدخل:" : "ZATCA Requirements:"}
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>{isRTL ? "رقم الفاتورة التسلسلي" : "Sequential invoice number"}</li>
                  <li>{isRTL ? "تاريخ ووقت الإصدار" : "Issue date and time"}</li>
                  <li>{isRTL ? "الرقم الضريبي للبائع" : "Seller VAT number"}</li>
                  <li>{isRTL ? "نسبة ضريبة 15%" : "15% VAT rate"}</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button className="w-full" onClick={() => handleSave("confirmed")} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 me-2" />
                  )}
                  {isRTL ? "إنشاء الفاتورة" : "Create Invoice"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSave("draft")} disabled={isSaving}>
                  <Save className="h-4 w-4 me-2" />
                  {isRTL ? "حفظ كمسودة" : "Save as Draft"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </UsageLimitGuard>
  );
};

export default CreateSalesInvoice;
