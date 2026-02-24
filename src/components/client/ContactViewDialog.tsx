import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Mail, MapPin, FileText, Building2 } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  name_en: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  tax_number: string | null;
  commercial_register: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  credit_limit: number | null;
  balance: number | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
}

interface ContactViewDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactViewDialog = ({ contact, open, onOpenChange }: ContactViewDialogProps) => {
  const { isRTL } = useLanguage();

  if (!contact) return null;

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-lg ${isRTL ? "rtl" : "ltr"}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contact.type === "vendor" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
            {isRTL ? contact.name : (contact.name_en || contact.name)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge variant={contact.is_active ? "default" : "secondary"}>
              {contact.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
            </Badge>
            <Badge variant="outline">
              {contact.type === "customer" ? (isRTL ? "عميل" : "Customer") : contact.type === "vendor" ? (isRTL ? "مورد" : "Vendor") : (isRTL ? "عميل ومورد" : "Both")}
            </Badge>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {isRTL ? "المعلومات الأساسية" : "Basic Info"}
            </h4>
            <InfoRow label={isRTL ? "الاسم (عربي)" : "Name (AR)"} value={contact.name} />
            <InfoRow label={isRTL ? "الاسم (إنجليزي)" : "Name (EN)"} value={contact.name_en} />
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {isRTL ? "الاتصال" : "Contact"}
            </h4>
            <InfoRow label={isRTL ? "الهاتف" : "Phone"} value={contact.phone} />
            <InfoRow label={isRTL ? "الجوال" : "Mobile"} value={contact.mobile} />
            <InfoRow label={isRTL ? "البريد" : "Email"} value={contact.email} />
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {isRTL ? "البيانات المالية" : "Financial"}
            </h4>
            <InfoRow label={isRTL ? "الرقم الضريبي" : "VAT No."} value={contact.tax_number} />
            <InfoRow label={isRTL ? "السجل التجاري" : "CR No."} value={contact.commercial_register} />
            <InfoRow label={isRTL ? "حد الائتمان" : "Credit Limit"} value={(contact.credit_limit ?? 0).toLocaleString()} />
            <InfoRow label={isRTL ? "الرصيد" : "Balance"} value={(contact.balance ?? 0).toLocaleString()} />
          </div>

          {(contact.city || contact.address) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {isRTL ? "العنوان" : "Address"}
                </h4>
                <InfoRow label={isRTL ? "المدينة" : "City"} value={contact.city} />
                <InfoRow label={isRTL ? "العنوان" : "Address"} value={contact.address} />
              </div>
            </>
          )}

          {contact.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">{isRTL ? "ملاحظات" : "Notes"}</h4>
                <p className="text-sm text-muted-foreground">{contact.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactViewDialog;
