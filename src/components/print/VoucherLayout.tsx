import React from "react";
import { PrintSettings, CompanyInfo, VoucherData } from "./types";

interface VoucherLayoutProps {
  settings: PrintSettings;
  company: CompanyInfo;
  voucher: VoucherData;
  isRTL?: boolean;
}

const fontFamilies: Record<string, string> = {
  default: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
  arabic: "'Noto Naskh Arabic', 'Traditional Arabic', serif",
};

/**
 * Receipt Voucher (سند قبض) and Payment Voucher (سند صرف) layout.
 * This is a completely separate layout from the journal/report PrintLayout.
 * It renders a business voucher format, NOT an accounting debit/credit table.
 */
export const VoucherLayout: React.FC<VoucherLayoutProps> = ({
  settings, company, voucher, isRTL = true,
}) => {
  const dir = isRTL ? "rtl" : "ltr";
  const font = fontFamilies[settings.font_family] || fontFamilies.default;
  const pc = settings.primary_color || "#1e40af";
  const isReceipt = voucher.type === "receipt";

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className="print-layout"
      dir={dir}
      style={{
        fontFamily: font,
        paddingTop: `${settings.top_offset || 0}mm`,
        paddingBottom: `${settings.bottom_offset || 0}mm`,
        paddingLeft: `${settings.left_offset || 0}mm`,
        paddingRight: `${settings.right_offset || 0}mm`,
        maxWidth: "210mm",
        margin: "0 auto",
        background: "white",
        color: "#1a1a1a",
        fontSize: "13px",
        lineHeight: "1.6",
      }}
    >
      {/* ─── Company Header ─── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "12px",
        marginBottom: "16px",
        borderBottom: `3px double ${pc}`,
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            {isRTL ? company.name : (company.name_en || company.name)}
          </h2>
          {company.name_en && isRTL && (
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#666" }}>{company.name_en}</p>
          )}
          {settings.show_tax_number && company.tax_number && (
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#888" }}>
              {isRTL ? "الرقم الضريبي: " : "Tax No: "}{company.tax_number}
            </p>
          )}
          {settings.show_commercial_register && company.commercial_register && (
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#888" }}>
              {isRTL ? "السجل التجاري: " : "CR: "}{company.commercial_register}
            </p>
          )}
          {company.address && (
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#888" }}>{company.address}</p>
          )}
        </div>

        {settings.show_logo && company.logo_url && (
          <div style={{ marginInlineStart: "16px" }}>
            <img src={company.logo_url} alt="Logo" style={{ height: "60px", objectFit: "contain" }} />
          </div>
        )}
      </div>

      {/* ─── Voucher Title ─── */}
      <div style={{
        textAlign: "center",
        marginBottom: "20px",
        padding: "10px",
        background: `${pc}0D`,
        borderRadius: "6px",
        border: `2px solid ${pc}`,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: 700,
          color: pc,
        }}>
          {isReceipt
            ? (isRTL ? "سند قبض" : "Receipt Voucher")
            : (isRTL ? "سند صرف" : "Payment Voucher")}
        </h1>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "30px",
          marginTop: "8px",
          fontSize: "13px",
        }}>
          <span>
            <strong>{isRTL ? "رقم: " : "No: "}</strong>
            <span style={{ fontFamily: "monospace" }}>{voucher.voucherNumber}</span>
          </span>
          <span>
            <strong>{isRTL ? "التاريخ: " : "Date: "}</strong>
            {voucher.date}
          </span>
        </div>
      </div>

      {/* ─── Voucher Body ─── */}
      <div style={{
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        overflow: "hidden",
        marginBottom: "20px",
      }}>
        {/* Contact Row */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #d1d5db",
          background: "#f9fafb",
        }}>
          <div style={{
            padding: "10px 14px",
            fontWeight: 600,
            width: "140px",
            borderInlineEnd: "1px solid #d1d5db",
            background: "#f3f4f6",
          }}>
            {isReceipt
              ? (isRTL ? "استلمنا من" : "Received From")
              : (isRTL ? "صُرف إلى" : "Paid To")}
          </div>
          <div style={{ padding: "10px 14px", flex: 1, fontWeight: 500 }}>
            {voucher.contactName || "—"}
          </div>
        </div>

        {/* Amount Row */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #d1d5db",
        }}>
          <div style={{
            padding: "10px 14px",
            fontWeight: 600,
            width: "140px",
            borderInlineEnd: "1px solid #d1d5db",
            background: "#f3f4f6",
          }}>
            {isRTL ? "المبلغ" : "Amount"}
          </div>
          <div style={{ padding: "10px 14px", flex: 1 }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: pc }}>
              {fmt(voucher.amount)}
            </span>
            <span style={{ fontSize: "12px", color: "#666", marginInlineStart: "6px" }}>
              {isRTL ? "ر.س" : "SAR"}
            </span>
            {voucher.amountInWords && (
              <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                {isRTL ? "فقط " : "Only "}{voucher.amountInWords}
                {isRTL ? " لا غير" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        {voucher.paymentMethod && (
          <div style={{
            display: "flex",
            borderBottom: "1px solid #d1d5db",
          }}>
            <div style={{
              padding: "10px 14px",
              fontWeight: 600,
              width: "140px",
              borderInlineEnd: "1px solid #d1d5db",
              background: "#f3f4f6",
            }}>
              {isRTL ? "طريقة الدفع" : "Payment Method"}
            </div>
            <div style={{ padding: "10px 14px", flex: 1 }}>
              {voucher.paymentMethod}
            </div>
          </div>
        )}

        {/* Reference */}
        {voucher.reference && (
          <div style={{
            display: "flex",
            borderBottom: "1px solid #d1d5db",
          }}>
            <div style={{
              padding: "10px 14px",
              fontWeight: 600,
              width: "140px",
              borderInlineEnd: "1px solid #d1d5db",
              background: "#f3f4f6",
            }}>
              {isRTL ? "المرجع" : "Reference"}
            </div>
            <div style={{ padding: "10px 14px", flex: 1, fontFamily: "monospace" }}>
              {voucher.reference}
            </div>
          </div>
        )}

        {/* Description / Reason */}
        {voucher.description && (
          <div style={{
            display: "flex",
            borderBottom: voucher.notes ? "1px solid #d1d5db" : "none",
          }}>
            <div style={{
              padding: "10px 14px",
              fontWeight: 600,
              width: "140px",
              borderInlineEnd: "1px solid #d1d5db",
              background: "#f3f4f6",
            }}>
              {isReceipt
                ? (isRTL ? "وذلك مقابل" : "In return for")
                : (isRTL ? "وذلك عن" : "Reason")}
            </div>
            <div style={{ padding: "10px 14px", flex: 1 }}>
              {voucher.description}
            </div>
          </div>
        )}

        {/* Notes */}
        {voucher.notes && (
          <div style={{ display: "flex" }}>
            <div style={{
              padding: "10px 14px",
              fontWeight: 600,
              width: "140px",
              borderInlineEnd: "1px solid #d1d5db",
              background: "#f3f4f6",
            }}>
              {isRTL ? "ملاحظات" : "Notes"}
            </div>
            <div style={{ padding: "10px 14px", flex: 1, fontSize: "12px", color: "#555" }}>
              {voucher.notes}
            </div>
          </div>
        )}
      </div>

      {/* ─── Signature Area ─── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "50px",
        paddingTop: "16px",
      }}>
        {[
          { label: isRTL ? "المُعد" : "Prepared By", name: voucher.preparedBy },
          { label: isReceipt ? (isRTL ? "المستلم" : "Received By") : (isRTL ? "المستلم" : "Received By"), name: voucher.receivedBy },
          { label: isRTL ? "المعتمد" : "Approved By", name: voucher.approvedBy },
        ].map((sig, i) => (
          <div key={i} style={{ textAlign: "center", width: "30%" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "30px" }}>
              {sig.label}
            </div>
            {settings.show_signature && settings.signature_url && i === 2 && (
              <img src={settings.signature_url} alt="Signature" style={{ height: "40px", display: "inline-block", marginBottom: "4px" }} />
            )}
            <div style={{
              borderTop: "1px solid #999",
              paddingTop: "6px",
              fontSize: "11px",
              color: "#666",
              minHeight: "20px",
            }}>
              {sig.name || ""}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Footer ─── */}
      {settings.show_footer && (
        <div style={{
          marginTop: "30px",
          paddingTop: "8px",
          borderTop: `2px solid ${pc}`,
          textAlign: "center",
          fontSize: "10px",
          color: "#666",
        }}>
          {settings.footer_text || (isRTL ? "تم إعداده بواسطة نظام Costamine المحاسبي" : "Generated by Costamine Accounting System")}
        </div>
      )}
    </div>
  );
};

export default VoucherLayout;
