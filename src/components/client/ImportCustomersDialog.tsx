import { useState, useRef } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface ImportCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactType: "customer" | "vendor";
}

interface ParsedRow {
  name: string;
  name_en?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  tax_number?: string;
  commercial_register?: string;
  city?: string;
  country?: string;
  address?: string;
  credit_limit?: number;
  notes?: string;
  valid: boolean;
  error?: string;
}

const TEMPLATE_COLUMNS_AR = [
  "الاسم (عربي) *",
  "الاسم (إنجليزي)",
  "البريد الإلكتروني",
  "الهاتف",
  "الجوال",
  "الرقم الضريبي",
  "السجل التجاري",
  "المدينة",
  "الدولة",
  "العنوان",
  "حد الائتمان",
  "ملاحظات",
];

const TEMPLATE_COLUMNS_EN = [
  "Name (Arabic) *",
  "Name (English)",
  "Email",
  "Phone",
  "Mobile",
  "Tax Number",
  "Commercial Register",
  "City",
  "Country",
  "Address",
  "Credit Limit",
  "Notes",
];

const SAMPLE_DATA_AR = [
  ["شركة النور للتجارة", "Al Noor Trading Co.", "info@alnoor.sa", "0112345678", "0551234567", "300012345600003", "1010123456", "الرياض", "SA", "حي العليا، شارع التحلية", 50000, "عميل رئيسي"],
  ["مؤسسة الأمل", "Al Amal Est.", "contact@alamal.sa", "0138765432", "0559876543", "", "1020654321", "جدة", "SA", "حي الحمراء", 25000, ""],
];

const ImportCustomersDialog = ({ open, onOpenChange, contactType }: ImportCustomersDialogProps) => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 });

  const typeLabel = contactType === "customer"
    ? (isRTL ? "العملاء" : "Customers")
    : (isRTL ? "الموردين" : "Vendors");

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const headers = isRTL ? TEMPLATE_COLUMNS_AR : TEMPLATE_COLUMNS_EN;
    const sampleData = SAMPLE_DATA_AR;

    const wsData = [headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    const sheetName = isRTL ? "بيانات" : "Data";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${contactType === "customer" ? "customers" : "vendors"}_template.xlsx`);

    toast.success(isRTL ? "تم تحميل النموذج بنجاح" : "Template downloaded successfully");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(isRTL ? "صيغة الملف غير مدعومة. يرجى استخدام ملف Excel أو CSV" : "Unsupported format. Please use Excel or CSV");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

        if (jsonData.length === 0) {
          toast.error(isRTL ? "الملف فارغ" : "File is empty");
          return;
        }

        const rows: ParsedRow[] = jsonData.map((row) => {
          const keys = Object.keys(row);
          // Map by column index (position-based) to handle AR/EN headers
          const name = String(row[keys[0]] || "").trim();
          const name_en = String(row[keys[1]] || "").trim();
          const email = String(row[keys[2]] || "").trim();
          const phone = String(row[keys[3]] || "").trim();
          const mobile = String(row[keys[4]] || "").trim();
          const tax_number = String(row[keys[5]] || "").trim();
          const commercial_register = String(row[keys[6]] || "").trim();
          const city = String(row[keys[7]] || "").trim();
          const country = String(row[keys[8]] || "").trim();
          const address = String(row[keys[9]] || "").trim();
          const credit_limit = parseFloat(row[keys[10]]) || 0;
          const notes = String(row[keys[11]] || "").trim();

          let valid = true;
          let error = "";

          if (!name || name.length < 2) {
            valid = false;
            error = isRTL ? "الاسم مطلوب (حرفين على الأقل)" : "Name required (min 2 chars)";
          }

          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            valid = false;
            error = isRTL ? "البريد الإلكتروني غير صالح" : "Invalid email";
          }

          return {
            name,
            name_en: name_en || undefined,
            email: email || undefined,
            phone: phone || undefined,
            mobile: mobile || undefined,
            tax_number: tax_number || undefined,
            commercial_register: commercial_register || undefined,
            city: city || undefined,
            country: country || undefined,
            address: address || undefined,
            credit_limit,
            notes: notes || undefined,
            valid,
            error,
          };
        });

        setParsedRows(rows);
        setStep("preview");
      } catch {
        toast.error(isRTL ? "خطأ في قراءة الملف" : "Error reading file");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!companyId) return;
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error(isRTL ? "لا توجد بيانات صالحة للاستيراد" : "No valid data to import");
      return;
    }

    setStep("importing");
    let success = 0;
    let failed = 0;

    // Insert in batches of 20
    const batchSize = 20;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map((row) => ({
        company_id: companyId,
        type: contactType,
        name: row.name,
        name_en: row.name_en || null,
        email: row.email || null,
        phone: row.phone || null,
        mobile: row.mobile || null,
        tax_number: row.tax_number || null,
        commercial_register: row.commercial_register || null,
        city: row.city || null,
        country: row.country || "SA",
        address: row.address || null,
        credit_limit: row.credit_limit || 0,
        notes: row.notes || null,
      }));

      const { error } = await supabase.from("contacts").insert(batch);
      if (error) {
        failed += batch.length;
      } else {
        success += batch.length;
      }
    }

    setImportResult({ success, failed });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
  };

  const handleClose = () => {
    setStep("upload");
    setParsedRows([]);
    setImportResult({ success: 0, failed: 0 });
    onOpenChange(false);
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {isRTL ? `استيراد ${typeLabel} من Excel` : `Import ${typeLabel} from Excel`}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && (isRTL
              ? "قم بتحميل النموذج وملئه ثم ارفع الملف لاستيراد البيانات"
              : "Download the template, fill it in, then upload to import")}
            {step === "preview" && (isRTL
              ? "راجع البيانات قبل الاستيراد"
              : "Review data before importing")}
            {step === "importing" && (isRTL ? "جاري الاستيراد..." : "Importing...")}
            {step === "done" && (isRTL ? "تم الاستيراد" : "Import complete")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-6 py-4">
              {/* Download Template */}
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center space-y-4 bg-primary/5">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {isRTL ? "الخطوة 1: تحميل النموذج" : "Step 1: Download Template"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRTL
                      ? "قم بتحميل ملف Excel النموذجي الذي يحتوي على الأعمدة المطلوبة وبيانات عينة"
                      : "Download the Excel template with required columns and sample data"}
                  </p>
                </div>
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isRTL ? "تحميل النموذج" : "Download Template"}
                </Button>
              </div>

              {/* Upload File */}
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {isRTL ? "الخطوة 2: رفع الملف" : "Step 2: Upload File"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRTL
                      ? "بعد ملء النموذج، ارفع الملف هنا (xlsx, xls, csv)"
                      : "After filling the template, upload the file here (xlsx, xls, csv)"}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {isRTL ? "اختيار ملف" : "Choose File"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {parsedRows.length} {isRTL ? "سجل" : "rows"}
                </Badge>
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {validCount} {isRTL ? "صالح" : "valid"}
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {invalidCount} {isRTL ? "غير صالح" : "invalid"}
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                      <TableHead>{isRTL ? "الاسم (EN)" : "Name (EN)"}</TableHead>
                      <TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead>
                      <TableHead>{isRTL ? "البريد" : "Email"}</TableHead>
                      <TableHead>{isRTL ? "المدينة" : "City"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx} className={!row.valid ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive">{row.error}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{row.name || "-"}</TableCell>
                        <TableCell>{row.name_en || "-"}</TableCell>
                        <TableCell dir="ltr" className="text-sm">{row.phone || "-"}</TableCell>
                        <TableCell dir="ltr" className="text-sm">{row.email || "-"}</TableCell>
                        <TableCell>{row.city || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {invalidCount > 0 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {isRTL
                    ? `سيتم تجاهل ${invalidCount} سجل غير صالح عند الاستيراد`
                    : `${invalidCount} invalid rows will be skipped during import`}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">
                {isRTL ? "جاري استيراد البيانات..." : "Importing data..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? "يرجى عدم إغلاق هذه النافذة" : "Please don't close this dialog"}
              </p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">
                {isRTL ? "تم الاستيراد بنجاح" : "Import Complete"}
              </h3>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="gap-1 bg-green-600 text-base px-4 py-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {importResult.success} {isRTL ? "تم إضافتهم" : "added"}
                </Badge>
                {importResult.failed > 0 && (
                  <Badge variant="destructive" className="gap-1 text-base px-4 py-1">
                    <XCircle className="h-4 w-4" />
                    {importResult.failed} {isRTL ? "فشل" : "failed"}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                {isRTL ? "رجوع" : "Back"}
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0} className="gap-2">
                <Upload className="h-4 w-4" />
                {isRTL ? `استيراد ${validCount} سجل` : `Import ${validCount} rows`}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>
              {isRTL ? "إغلاق" : "Close"}
            </Button>
          )}
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportCustomersDialog;
