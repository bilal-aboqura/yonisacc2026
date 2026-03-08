import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { PrintLayout } from "./PrintLayout";
import { VoucherLayout } from "./VoucherLayout";
import { PrintSettings, CompanyInfo, PrintableDocument, PrintDocumentType, VoucherData } from "./types";

interface PrintDialogBaseProps {
  open: boolean;
  onClose: () => void;
  settings: PrintSettings;
  company: CompanyInfo;
  isRTL?: boolean;
  children?: React.ReactNode;
}

/** For journal/report documents */
interface PrintDialogReportProps extends PrintDialogBaseProps {
  documentType?: "journal" | "report";
  document: PrintableDocument;
  voucher?: never;
}

/** For receipt/payment vouchers */
interface PrintDialogVoucherProps extends PrintDialogBaseProps {
  documentType: "receipt" | "payment";
  voucher: VoucherData;
  document?: never;
}

type PrintDialogProps = PrintDialogReportProps | PrintDialogVoucherProps;

export const PrintDialog: React.FC<PrintDialogProps> = (props) => {
  const {
    open, onClose, settings, company, isRTL = true, children,
  } = props;

  const printRef = useRef<HTMLDivElement>(null);
  const docType: PrintDocumentType = props.documentType || "journal";

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  const isVoucher = docType === "receipt" || docType === "payment";

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
      <div className="flex justify-center p-8 print:p-0 print:m-0">
        <div
          ref={printRef}
          className="bg-white shadow-lg print:shadow-none print-wrapper"
          style={{
            width: "210mm",
            boxSizing: "border-box",
          }}
        >
          {isVoucher && 'voucher' in props && props.voucher ? (
            <VoucherLayout
              settings={settings}
              company={company}
              voucher={props.voucher}
              isRTL={isRTL}
            />
          ) : 'document' in props && props.document ? (
            <PrintLayout
              settings={settings}
              company={company}
              document={props.document}
              isRTL={isRTL}
            >
              {children}
            </PrintLayout>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PrintDialog;
