import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Printer, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { useLanguage } from "@/hooks/useLanguage";
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
  reference_number: string | null;
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

// Document type configuration
const getDocConfig = (type: string, isRTL: boolean) => {
  const configs: Record<string, { titleAr: string; titleEn: string; sellerAr: string; sellerEn: string; buyerAr: string; buyerEn: string; showQR: boolean; isQuote: boolean }> = {
    quote: {
      titleAr: "عرض سعر", titleEn: "Quotation",
      sellerAr: "معلومات المورد", sellerEn: "Supplier Info",
      buyerAr: "معلومات العميل", buyerEn: "Customer Info",
      showQR: false, isQuote: true,
    },
    sale: {
      titleAr: "فاتورة ضريبية", titleEn: "Tax Invoice",
      sellerAr: "معلومات البائع", sellerEn: "Seller Info",
      buyerAr: "معلومات المشتري", buyerEn: "Buyer Info",
      showQR: true, isQuote: false,
    },
    purchase: {
      titleAr: "فاتورة مشتريات", titleEn: "Purchase Invoice",
      sellerAr: "معلومات المورد", sellerEn: "Vendor Info",
      buyerAr: "معلومات المشتري", buyerEn: "Buyer Info",
      showQR: true, isQuote: false,
    },
    purchase_order: {
      titleAr: "أمر شراء", titleEn: "Purchase Order",
      sellerAr: "معلومات المورد", sellerEn: "Vendor Info",
      buyerAr: "معلومات الشركة", buyerEn: "Company Info",
      showQR: false, isQuote: true,
    },
  };
  return configs[type] || configs.sale;
};

const ViewInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId, isLoading: companyLoading } = useCompanyId();
  const { settings } = usePrintSettings(companyId);
  const { isRTL } = useLanguage();
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
      const { data: compData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId!)
        .single();
      if (companyError) throw companyError;
      setCompany(compData);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(`*, contact:contacts(name, name_en, tax_number, address, city, phone, email)`)
        .eq("id", id)
        .eq("company_id", companyId!)
        .maybeSingle();
      if (invoiceError) throw invoiceError;
      if (!invoiceData) {
        setLoading(false);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`*, product:products(name, name_en, sku)`)
        .eq("invoice_id", id)
        .order("sort_order");
      if (itemsError) throw itemsError;

      setInvoice({ ...invoiceData, items: itemsData || [] });
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateZatcaQR = () => {
    if (!invoice || !company) return "";
    const tlvData = [
      { tag: 1, value: company.name },
      { tag: 2, value: company.tax_number || "" },
      { tag: 3, value: new Date(invoice.invoice_date).toISOString() },
      { tag: 4, value: (invoice.total || 0).toFixed(2) },
      { tag: 5, value: (invoice.tax_amount || 0).toFixed(2) },
    ];
    let tlvBytes: number[] = [];
    tlvData.forEach(({ tag, value }) => {
      const valueBytes = new TextEncoder().encode(value);
      tlvBytes.push(tag, valueBytes.length, ...valueBytes);
    });
    return btoa(String.fromCharCode(...tlvBytes));
  };

  const handlePrint = () => window.print();

  const fmt = (amount: number | null) =>
    (amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" });

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
        <p className="text-muted-foreground">{isRTL ? "لم يتم العثور على المستند" : "Document not found"}</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          {isRTL ? "العودة" : "Go Back"}
        </Button>
      </div>
    );
  }

  const config = getDocConfig(invoice.type, isRTL);
  const pc = settings.primary_color || "#1e40af";
  const qrData = generateZatcaQR();

  return (
    <div className="space-y-4">
      {/* Action Bar - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isRTL ? config.titleAr : config.titleEn}</h1>
            <p className="text-sm text-muted-foreground">{isRTL ? "رقم:" : "#"} {invoice.invoice_number}</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          {isRTL ? "طباعة" : "Print"}
        </Button>
      </div>

      {/* ═══════ A4 Print Document ═══════ */}
      <div
        ref={printRef}
        id="invoice-print-area"
        dir="rtl"
        style={{
          maxWidth: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          background: "white",
          color: "#1a1a1a",
          fontFamily: "'Segoe UI', Tahoma, sans-serif",
          fontSize: "12px",
          lineHeight: "1.5",
          padding: "12mm 15mm",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
        className="shadow-lg border print:shadow-none print:border-none"
      >
        {/* Draft Watermark */}
        {invoice.status === "draft" && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-35deg)",
            fontSize: "120px",
            fontWeight: 900,
            color: "rgba(220, 38, 38, 0.08)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 0,
            letterSpacing: "10px",
            userSelect: "none",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact" as any,
          }}>
            مسودة
          </div>
        )}
        {/* ─── Header: Company + Document Title ─── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingBottom: "10px",
          borderBottom: `3px solid ${pc}`,
          marginBottom: "14px",
        }}>
          {/* Company Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>
              {company.name}
            </h2>
            {company.name_en && (
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#666" }}>{company.name_en}</p>
            )}
            {company.tax_number && (
              <p style={{ margin: "3px 0 0", fontSize: "10px", color: "#888" }}>
                الرقم الضريبي: {company.tax_number}
              </p>
            )}
            {company.commercial_register && (
              <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#888" }}>
                السجل التجاري: {company.commercial_register}
              </p>
            )}
            {company.address && (
              <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#888" }}>{company.address}</p>
            )}
            {company.phone && (
              <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#888" }}>هاتف: {company.phone}</p>
            )}
          </div>

          {/* Logo */}
          {company.logo_url && (
            <div style={{ margin: "0 20px" }}>
              <img src={company.logo_url} alt="Logo" style={{ height: "60px", objectFit: "contain" }} />
            </div>
          )}

          {/* Document Title */}
          <div style={{ textAlign: "left", flex: 1 }}>
            <h1 style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 800,
              color: pc,
            }}>
              {config.titleAr}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#666" }}>{config.titleEn}</p>
          </div>
        </div>

        {/* ─── Document Meta ─── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0",
          marginBottom: "14px",
          border: `1px solid ${pc}40`,
          borderRadius: "4px",
          overflow: "hidden",
        }}>
          {[
            { label: isRTL ? "رقم المستند" : "Doc No.", value: invoice.invoice_number },
            { label: isRTL ? "تاريخ الإصدار" : "Issue Date", value: fmtDate(invoice.invoice_date) },
            { label: isRTL ? "تاريخ الاستحقاق" : "Due Date", value: invoice.due_date ? fmtDate(invoice.due_date) : "—" },
          ].map((item, i) => (
            <div key={i} style={{
              textAlign: "center",
              padding: "8px 6px",
              borderLeft: i > 0 ? `1px solid ${pc}30` : "none",
            }}>
              <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase", fontWeight: 600 }}>
                {item.label}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "monospace", marginTop: "2px" }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Seller & Buyer ─── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "14px",
        }}>
          {/* Seller / Supplier */}
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            overflow: "hidden",
          }}>
            <div style={{
              background: pc,
              color: "white",
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: 700,
            }}>
              {isRTL ? config.sellerAr : config.sellerEn}
            </div>
            <div style={{ padding: "8px 10px", fontSize: "11px", lineHeight: "1.7" }}>
              <div><strong>{company.name}</strong></div>
              {company.tax_number && <div style={{ color: "#666" }}>الرقم الضريبي: {company.tax_number}</div>}
              {company.address && <div style={{ color: "#666" }}>{company.address}</div>}
              {company.phone && <div style={{ color: "#666" }}>هاتف: {company.phone}</div>}
            </div>
          </div>

          {/* Buyer / Customer */}
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            overflow: "hidden",
          }}>
            <div style={{
              background: pc,
              color: "white",
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: 700,
            }}>
              {isRTL ? config.buyerAr : config.buyerEn}
            </div>
            <div style={{ padding: "8px 10px", fontSize: "11px", lineHeight: "1.7" }}>
              {invoice.contact ? (
                <>
                  <div><strong>{invoice.contact.name}</strong></div>
                  {invoice.contact.tax_number && <div style={{ color: "#666" }}>الرقم الضريبي: {invoice.contact.tax_number}</div>}
                  {invoice.contact.address && (
                    <div style={{ color: "#666" }}>
                      {invoice.contact.address}{invoice.contact.city ? `، ${invoice.contact.city}` : ""}
                    </div>
                  )}
                  {invoice.contact.phone && <div style={{ color: "#666" }}>هاتف: {invoice.contact.phone}</div>}
                  {invoice.contact.email && <div style={{ color: "#666" }}>{invoice.contact.email}</div>}
                </>
              ) : (
                <div style={{ color: "#999" }}>{isRTL ? "عميل نقدي" : "Cash Customer"}</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Items Table ─── */}
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "12px",
          fontSize: "11px",
        }}>
          <thead>
            <tr>
              {["#", "الصنف | Item", "الكمية", "سعر الوحدة", "الخصم", "الضريبة", "الإجمالي"].map((h, i) => (
                <th key={i} style={{
                  padding: "7px 8px",
                  background: pc,
                  color: "white",
                  fontWeight: 700,
                  textAlign: i === 0 || i === 1 ? "right" : "center",
                  fontSize: "10px",
                  whiteSpace: "nowrap",
                  borderBottom: `2px solid ${pc}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#888", width: "30px" }}>
                  {index + 1}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                  <div style={{ fontWeight: 600 }}>{item.product?.name || item.description || "—"}</div>
                  {item.product?.name_en && (
                    <div style={{ fontSize: "9px", color: "#999" }}>{item.product.name_en}</div>
                  )}
                  {item.product?.sku && (
                    <div style={{ fontSize: "9px", color: "#aaa", fontFamily: "monospace" }}>SKU: {item.product.sku}</div>
                  )}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {fmt(item.unit_price)}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: item.discount_amount ? "#dc2626" : "#ccc" }}>
                  {item.discount_amount ? fmt(item.discount_amount) : "—"}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {fmt(item.tax_amount)}
                </td>
                <td style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {fmt(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ─── Totals + QR ─── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          marginBottom: "14px",
        }}>
          {/* QR Code (only for tax invoices) */}
          {config.showQR && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              background: "#fafafa",
            }}>
              <QRCodeSVG value={qrData} size={110} level="M" includeMargin />
              <p style={{ fontSize: "8px", color: "#999", marginTop: "4px", textAlign: "center" }}>
                رمز QR متوافق مع هيئة الزكاة
                <br />ZATCA Compliant
              </p>
            </div>
          )}

          {/* Totals Table */}
          <div style={{
            flex: 1,
            maxWidth: config.showQR ? "55%" : "50%",
            marginRight: config.showQR ? "0" : "auto",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <TotalRow label="المجموع الفرعي | Subtotal" value={fmt(invoice.subtotal)} />
                {(invoice.discount_amount || 0) > 0 && (
                  <TotalRow label="الخصم | Discount" value={`- ${fmt(invoice.discount_amount)}`} color="#dc2626" />
                )}
                <TotalRow label="ضريبة القيمة المضافة | VAT (15%)" value={fmt(invoice.tax_amount)} />
                <tr>
                  <td style={{
                    padding: "10px 12px",
                    fontWeight: 800,
                    fontSize: "14px",
                    background: pc,
                    color: "white",
                    borderRadius: "0 0 4px 0",
                  }}>
                    الإجمالي | Total
                  </td>
                  <td style={{
                    padding: "10px 12px",
                    fontWeight: 800,
                    fontSize: "14px",
                    textAlign: "left",
                    background: pc,
                    color: "white",
                    fontVariantNumeric: "tabular-nums",
                    borderRadius: "0 0 0 4px",
                  }}>
                    {fmt(invoice.total)} ر.س
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Notes ─── */}
        {invoice.notes && (
          <div style={{
            padding: "8px 12px",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            fontSize: "11px",
            marginBottom: "14px",
          }}>
            <strong>ملاحظات | Notes:</strong>
            <div style={{ marginTop: "4px", color: "#555", whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
          </div>
        )}

        {/* ─── Signature Area ─── */}
        {settings.show_signature && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "30px",
            paddingTop: "10px",
          }}>
            {[
              { label: "المُعد | Prepared By" },
              { label: "المُستلم | Received By" },
              { label: "المُعتمد | Approved By" },
            ].map((sig, i) => (
              <div key={i} style={{ textAlign: "center", width: "30%" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, marginBottom: "30px", color: "#555" }}>
                  {sig.label}
                </div>
                {settings.signature_url && i === 2 && (
                  <img src={settings.signature_url} alt="Signature" style={{ height: "35px", display: "inline-block", marginBottom: "4px" }} />
                )}
                <div style={{ borderTop: "1px solid #999", paddingTop: "6px", fontSize: "10px", color: "#888" }}>
                  &nbsp;
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Footer ─── */}
        <div style={{
          marginTop: "auto",
          paddingTop: "10px",
          borderTop: `2px solid ${pc}`,
          textAlign: "center",
          fontSize: "9px",
          color: "#888",
        }}>
          {config.isQuote ? (
            <>
              <p style={{ margin: 0 }}>هذا عرض سعر وليس فاتورة ضريبية — صالح لمدة 30 يوم من تاريخ الإصدار</p>
              <p style={{ margin: "2px 0 0" }}>This is a quotation, not a tax invoice — Valid for 30 days from issue date</p>
            </>
          ) : (
            <>
              <p style={{ margin: 0 }}>فاتورة ضريبية صادرة وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك</p>
              <p style={{ margin: "2px 0 0" }}>Tax invoice issued in accordance with ZATCA requirements</p>
            </>
          )}
        </div>
      </div>

      {/* ═══════ Print CSS ═══════ */}
      <style>{`
        @media print {
          /* Hide everything except the print area */
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 10mm 12mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          /* Hide action bar */
          .print\\:hidden { display: none !important; }
          /* Ensure sidebar and nav are hidden */
          nav, aside, header, [data-sidebar], [role="navigation"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

/* ─── Helper: Total Row ─── */
function TotalRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <tr>
      <td style={{
        padding: "6px 12px",
        fontSize: "11px",
        color: "#555",
        borderBottom: "1px solid #f0f0f0",
        background: "#fafafa",
      }}>
        {label}
      </td>
      <td style={{
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 600,
        textAlign: "left",
        borderBottom: "1px solid #f0f0f0",
        background: "#fafafa",
        fontVariantNumeric: "tabular-nums",
        color: color || "#1a1a1a",
      }}>
        {value} ر.س
      </td>
    </tr>
  );
}

export default ViewInvoice;
