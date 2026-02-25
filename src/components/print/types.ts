export interface PrintSettings {
  id?: string;
  company_id?: string;
  show_logo: boolean;
  show_signature: boolean;
  show_opening_balance: boolean;
  show_tax_number: boolean;
  show_commercial_register: boolean;
  show_footer: boolean;
  footer_text: string;
  primary_color: string;
  font_family: string;
  letterhead_type: "none" | "uploaded" | "system_template";
  letterhead_file_url: string | null;
  signature_url: string | null;
  template_style: "classic" | "modern" | "minimal" | "government";
  top_offset: number;
  bottom_offset: number;
  left_offset: number;
  right_offset: number;
}

export const defaultPrintSettings: PrintSettings = {
  show_logo: true,
  show_signature: false,
  show_opening_balance: true,
  show_tax_number: true,
  show_commercial_register: true,
  show_footer: true,
  footer_text: "",
  primary_color: "#1e40af",
  font_family: "default",
  letterhead_type: "none",
  letterhead_file_url: null,
  signature_url: null,
  template_style: "classic",
  top_offset: 0,
  bottom_offset: 0,
  left_offset: 0,
  right_offset: 0,
};

export interface CompanyInfo {
  name: string;
  name_en?: string | null;
  logo_url?: string | null;
  tax_number?: string | null;
  commercial_register?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface PrintableDocument {
  title: string;
  subtitle?: string;
  date?: string;
  number?: string;
  extraFields?: { label: string; value: string }[];
  table?: {
    headers: string[];
    rows: (string | number)[][];
    totals?: (string | number)[];
  };
  notes?: string;
}
