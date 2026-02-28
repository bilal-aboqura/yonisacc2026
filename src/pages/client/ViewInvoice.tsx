import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Printer, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface InvoiceItem {
  id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number | null;
  discount_amount: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number | null;
  product?: {
    name: string;
    name_en: string | null;
    sku: string | null;
  } | null;
}

interface Invoice {
  id: string;
  type: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: string | null;
  payment_status: string | null;
  subtotal: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total: number | null;
  notes: string | null;
  contact?: {
    name: string;
    name_en: string | null;
    tax_number: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  items: InvoiceItem[];
}

interface CompanyInfo {
  name: string;
  name_en: string | null;
  tax_number: string | null;
  commercial_register: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

const ViewInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId, isLoading: companyLoading } = useCompanyId();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading) return;
    if (companyId && id) {
      fetchInvoiceData();
    } else {
      setLoading(false);
    }
  }, [companyId, companyLoading, id]);

  const fetchInvoiceData = async () => {
    try {
      // Fetch company info using companyId
      const { data: compData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId!)
        .single();

      if (companyError) throw companyError;
      setCompany(compData);

      // Fetch invoice with contact
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          contact:contacts(name, name_en, tax_number, address, city, phone, email)
        `)
        .eq("id", id)
        .eq("company_id", companyId!)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch invoice items with products
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          *,
          product:products(name, name_en, sku)
        `)
        .eq("invoice_id", id)
        .order("sort_order");

      if (itemsError) throw itemsError;

      setInvoice({
        ...invoiceData,
        items: itemsData || [],
      });
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل بيانات الفاتورة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate ZATCA TLV (Tag-Length-Value) format for QR Code
  const generateZatcaQR = () => {
    if (!invoice || !company) return "";

    const sellerName = company.name;
    const vatNumber = company.tax_number || "";
    const timestamp = new Date(invoice.invoice_date).toISOString();
    const totalWithVat = (invoice.total || 0).toFixed(2);
    const vatAmount = (invoice.tax_amount || 0).toFixed(2);

    // Create TLV format as base64
    const tlvData = [
      { tag: 1, value: sellerName },
      { tag: 2, value: vatNumber },
      { tag: 3, value: timestamp },
      { tag: 4, value: totalWithVat },
      { tag: 5, value: vatAmount },
    ];

    let tlvBytes: number[] = [];
    tlvData.forEach(({ tag, value }) => {
      const valueBytes = new TextEncoder().encode(value);
      tlvBytes.push(tag);
      tlvBytes.push(valueBytes.length);
      tlvBytes.push(...valueBytes);
    });

    return btoa(String.fromCharCode(...tlvBytes));
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    return (amount || 0).toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
      confirmed: { label: "مؤكدة", className: "bg-primary/10 text-primary" },
      paid: { label: "مدفوعة", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
      cancelled: { label: "ملغية", className: "bg-destructive/10 text-destructive" },
    };
    const { label, className } = statusMap[status || "draft"] || statusMap.draft;
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${className}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice || !company) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">لم يتم العثور على الفاتورة</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          العودة
        </Button>
      </div>
    );
  }

  const qrCodeData = generateZatcaQR();

  return (
    <div className="space-y-6">
      {/* Header Actions - Hidden in Print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {invoice.type === "quote" ? "عرض سعر" : invoice.type === "purchase" ? "فاتورة مشتريات" : "فاتورة ضريبية"}
            </h1>
            <p className="text-muted-foreground">رقم: {invoice.invoice_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <Card ref={printRef} className="p-8 print:shadow-none print:border-none bg-background">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-primary">فاتورة ضريبية</h2>
            <p className="text-lg text-muted-foreground">Tax Invoice</p>
            <div className="mt-4">
              {getStatusBadge(invoice.status)}
            </div>
          </div>
          <div className="text-left">
            {company.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-16 mb-2" />
            )}
            <h3 className="text-xl font-bold">{company.name}</h3>
            {company.name_en && <p className="text-muted-foreground">{company.name_en}</p>}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Seller & Buyer Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Seller Info */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-bold text-lg border-b pb-2">معلومات البائع | Seller</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">الاسم:</span> {company.name}</p>
              {company.tax_number && (
                <p><span className="text-muted-foreground">الرقم الضريبي:</span> {company.tax_number}</p>
              )}
              {company.commercial_register && (
                <p><span className="text-muted-foreground">السجل التجاري:</span> {company.commercial_register}</p>
              )}
              {company.address && (
                <p><span className="text-muted-foreground">العنوان:</span> {company.address}</p>
              )}
              {company.phone && (
                <p><span className="text-muted-foreground">الهاتف:</span> {company.phone}</p>
              )}
              {company.email && (
                <p><span className="text-muted-foreground">البريد:</span> {company.email}</p>
              )}
            </div>
          </div>

          {/* Buyer Info */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-bold text-lg border-b pb-2">معلومات المشتري | Buyer</h4>
            {invoice.contact ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">الاسم:</span> {invoice.contact.name}</p>
                {invoice.contact.tax_number && (
                  <p><span className="text-muted-foreground">الرقم الضريبي:</span> {invoice.contact.tax_number}</p>
                )}
                {invoice.contact.address && (
                  <p><span className="text-muted-foreground">العنوان:</span> {invoice.contact.address} {invoice.contact.city && `، ${invoice.contact.city}`}</p>
                )}
                {invoice.contact.phone && (
                  <p><span className="text-muted-foreground">الهاتف:</span> {invoice.contact.phone}</p>
                )}
                {invoice.contact.email && (
                  <p><span className="text-muted-foreground">البريد:</span> {invoice.contact.email}</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">عميل نقدي</p>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-primary/5 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">رقم الفاتورة</p>
            <p className="font-bold text-lg">{invoice.invoice_number}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">تاريخ الإصدار</p>
            <p className="font-bold text-lg">{formatDate(invoice.invoice_date)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">تاريخ الاستحقاق</p>
            <p className="font-bold text-lg">{invoice.due_date ? formatDate(invoice.due_date) : "-"}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-right font-bold">#</th>
                <th className="p-3 text-right font-bold">الصنف | Item</th>
                <th className="p-3 text-center font-bold">الكمية</th>
                <th className="p-3 text-center font-bold">السعر</th>
                <th className="p-3 text-center font-bold">الخصم</th>
                <th className="p-3 text-center font-bold">الضريبة (15%)</th>
                <th className="p-3 text-left font-bold">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-right">{index + 1}</td>
                  <td className="p-3 text-right">
                    <div>
                      <p className="font-medium">{item.product?.name || item.description || "-"}</p>
                      {item.product?.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-center">{formatCurrency(item.unit_price)}</td>
                  <td className="p-3 text-center">
                    {item.discount_amount ? formatCurrency(item.discount_amount) : "-"}
                  </td>
                  <td className="p-3 text-center">{formatCurrency(item.tax_amount)}</td>
                  <td className="p-3 text-left font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & QR Code */}
        <div className="grid grid-cols-2 gap-8">
          {/* QR Code - ZATCA Compliant */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
            <QRCodeSVG
              value={qrCodeData}
              size={150}
              level="M"
              includeMargin={true}
              className="bg-white p-2 rounded"
            />
            <p className="text-xs text-muted-foreground mt-3 text-center">
              رمز الاستجابة السريعة متوافق مع هيئة الزكاة والدخل
              <br />
              ZATCA Compliant QR Code
            </p>
          </div>

          {/* Totals */}
          <div className="space-y-3 p-6 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي | Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)} ر.س</span>
            </div>
            {(invoice.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>الخصم | Discount</span>
                <span>- {formatCurrency(invoice.discount_amount)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ضريبة القيمة المضافة (15%) | VAT</span>
              <span>{formatCurrency(invoice.tax_amount)} ر.س</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>الإجمالي شامل الضريبة | Total</span>
              <span className="text-primary">{formatCurrency(invoice.total)} ر.س</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-bold mb-2">ملاحظات | Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
          <p>هذه فاتورة ضريبية صادرة وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك</p>
          <p className="mt-1">This is a tax invoice issued in accordance with ZATCA requirements</p>
        </div>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [data-slot="card"],
          [data-slot="card"] * {
            visibility: visible;
          }
          [data-slot="card"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewInvoice;
