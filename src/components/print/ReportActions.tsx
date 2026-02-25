import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileSpreadsheet, FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PrintDialog } from "@/components/print/PrintDialog";
import { PrintableDocument, CompanyInfo } from "@/components/print/types";
import { PrintSettings } from "@/components/print/types";

interface ReportActionsProps {
  /** Already-fetched print settings */
  printSettings: PrintSettings;
  /** Company info for the print header */
  company: CompanyInfo;
  /** The report data formatted for PrintLayout */
  document: PrintableDocument;
  isRTL: boolean;
  /** Called when user clicks Excel export */
  onExportExcel?: () => void;
  /** Called when user clicks PDF (uses browser print) */
  onExportPDF?: () => void;
  /** Whether export is allowed by permission */
  canExport?: boolean;
}

/**
 * Shared action bar for all financial reports.
 * Renders Print / PDF / Excel buttons with permission awareness.
 */
const ReportActions: React.FC<ReportActionsProps> = ({
  printSettings,
  company,
  document: doc,
  isRTL,
  onExportExcel,
  onExportPDF,
  canExport = true,
}) => {
  const [showPrint, setShowPrint] = useState(false);

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className="flex gap-1.5">
          {/* Print */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setShowPrint(true)}>
                <Printer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRTL ? "طباعة" : "Print"}</TooltipContent>
          </Tooltip>

          {/* PDF (uses browser print to PDF) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={!canExport}
                onClick={() => {
                  setShowPrint(true);
                  // PDF is just browser print → Save as PDF
                  if (onExportPDF) onExportPDF();
                }}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!canExport
                ? (isRTL ? "متاح في خطة أعلى" : "Available in higher plan")
                : (isRTL ? "تصدير PDF" : "Export PDF")}
            </TooltipContent>
          </Tooltip>

          {/* Excel */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={!canExport}
                onClick={onExportExcel}
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!canExport
                ? (isRTL ? "متاح في خطة أعلى" : "Available in higher plan")
                : (isRTL ? "تصدير Excel" : "Export Excel")}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Print Dialog - uses the company's saved template style */}
      <PrintDialog
        open={showPrint}
        onClose={() => setShowPrint(false)}
        settings={printSettings}
        company={company}
        documentType="report"
        document={doc}
        isRTL={isRTL}
      />
    </>
  );
};

export default ReportActions;
