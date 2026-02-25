import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { PrintLayout } from "./PrintLayout";
import { PrintSettings, CompanyInfo, PrintableDocument } from "./types";

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  settings: PrintSettings;
  company: CompanyInfo;
  document: PrintableDocument;
  isRTL?: boolean;
  children?: React.ReactNode;
}

export const PrintDialog: React.FC<PrintDialogProps> = ({
  open, onClose, settings, company, document: doc, isRTL = true, children,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 overflow-auto">
      {/* Toolbar - hidden on print */}
      <div className="sticky top-0 z-10 bg-background border-b p-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <span className="font-medium">{isRTL ? "معاينة الطباعة" : "Print Preview"}</span>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          {isRTL ? "طباعة" : "Print"}
        </Button>
      </div>

      {/* Print Content */}
      <div className="flex justify-center p-8 print:p-0">
        <div
          ref={printRef}
          className="bg-white shadow-lg print:shadow-none"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "15mm",
          }}
        >
          <PrintLayout
            settings={settings}
            company={company}
            document={doc}
            isRTL={isRTL}
          >
            {children}
          </PrintLayout>
        </div>
      </div>
    </div>
  );
};

export default PrintDialog;
