/**
 * ZATCA Phase 2 Utility Functions
 * Handles TLV encoding, QR code generation, and XML building helpers
 */

// TLV Tag definitions for ZATCA QR Code
export const ZATCA_TLV_TAGS = {
  SELLER_NAME: 1,
  VAT_NUMBER: 2,
  TIMESTAMP: 3,
  INVOICE_TOTAL: 4,
  VAT_TOTAL: 5,
  INVOICE_HASH: 6,
  ECDSA_SIGNATURE: 7,
  ECDSA_PUBLIC_KEY: 8,
  ECDSA_STAMP_IDENTIFIER: 9,
} as const;

/**
 * Encode a value into TLV (Tag-Length-Value) format
 */
export function encodeTLV(tag: number, value: string): Uint8Array {
  const valueBytes = new TextEncoder().encode(value);
  const result = new Uint8Array(2 + valueBytes.length);
  result[0] = tag;
  result[1] = valueBytes.length;
  result.set(valueBytes, 2);
  return result;
}

/**
 * Generate ZATCA Phase 1 QR Code (basic TLV)
 */
export function generatePhase1QR(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  total: number,
  vatAmount: number
): string {
  const tlvParts = [
    encodeTLV(ZATCA_TLV_TAGS.SELLER_NAME, sellerName),
    encodeTLV(ZATCA_TLV_TAGS.VAT_NUMBER, vatNumber),
    encodeTLV(ZATCA_TLV_TAGS.TIMESTAMP, timestamp),
    encodeTLV(ZATCA_TLV_TAGS.INVOICE_TOTAL, total.toFixed(2)),
    encodeTLV(ZATCA_TLV_TAGS.VAT_TOTAL, vatAmount.toFixed(2)),
  ];

  const totalLength = tlvParts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of tlvParts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return btoa(String.fromCharCode(...combined));
}

/**
 * Generate ZATCA Phase 2 QR Code (extended TLV with hash and signature)
 */
export function generatePhase2QR(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  total: number,
  vatAmount: number,
  invoiceHash?: string,
  signature?: string,
  publicKey?: string,
  stampIdentifier?: string
): string {
  const tlvParts = [
    encodeTLV(ZATCA_TLV_TAGS.SELLER_NAME, sellerName),
    encodeTLV(ZATCA_TLV_TAGS.VAT_NUMBER, vatNumber),
    encodeTLV(ZATCA_TLV_TAGS.TIMESTAMP, timestamp),
    encodeTLV(ZATCA_TLV_TAGS.INVOICE_TOTAL, total.toFixed(2)),
    encodeTLV(ZATCA_TLV_TAGS.VAT_TOTAL, vatAmount.toFixed(2)),
  ];

  if (invoiceHash) {
    tlvParts.push(encodeTLV(ZATCA_TLV_TAGS.INVOICE_HASH, invoiceHash));
  }
  if (signature) {
    tlvParts.push(encodeTLV(ZATCA_TLV_TAGS.ECDSA_SIGNATURE, signature));
  }
  if (publicKey) {
    tlvParts.push(encodeTLV(ZATCA_TLV_TAGS.ECDSA_PUBLIC_KEY, publicKey));
  }
  if (stampIdentifier) {
    tlvParts.push(encodeTLV(ZATCA_TLV_TAGS.ECDSA_STAMP_IDENTIFIER, stampIdentifier));
  }

  const totalLength = tlvParts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of tlvParts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return btoa(String.fromCharCode(...combined));
}

/**
 * ZATCA status labels
 */
export const ZATCA_STATUS_MAP = {
  not_submitted: { ar: "غير مرسلة", en: "Not Submitted", color: "secondary" as const },
  pending: { ar: "قيد الإرسال", en: "Pending", color: "default" as const },
  cleared: { ar: "معتمدة", en: "Cleared", color: "default" as const },
  reported: { ar: "تم الإبلاغ", en: "Reported", color: "default" as const },
  rejected: { ar: "مرفوضة", en: "Rejected", color: "destructive" as const },
} as const;

export type ZatcaStatus = keyof typeof ZATCA_STATUS_MAP;

/**
 * ZATCA environment labels
 */
export const ZATCA_ENV_MAP = {
  sandbox: { ar: "بيئة اختبار", en: "Sandbox" },
  production: { ar: "بيئة إنتاج", en: "Production" },
} as const;
