import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRight, ArrowLeft, BookOpen, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { PrintDialog } from "@/components/print/PrintDialog";
import { PrintableDocument, CompanyInfo } from "@/components/print/types";
import { useState } from "react";

const ViewJournalEntry = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();
  const { user } = useAuth();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const [showPrint, setShowPrint] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("companies").select("id, currency, name, name_en, logo_url, tax_number, commercial_register, address, phone, email").eq("owner_id", user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { settings } = usePrintSettings(company?.id);

  const { data: entry, isLoading } = useQuery({
    queryKey: ["journal-entry", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: lines } = useQuery({
    queryKey: ["journal-entry-lines", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("*, accounts:account_id(code, name, name_en), cost_centers:cost_center_id(code, name, name_en)")
        .eq("entry_id", id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const currency = isRTL ? "ر.س" : (company?.currency || "SAR");
  const fmt = (n: number | null) => (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build printable document
  const printDoc: PrintableDocument | null = entry && lines ? {
    title: isRTL ? "قيد محاسبي" : "Journal Entry",
    subtitle: entry.is_auto ? (isRTL ? "قيد آلي" : "Auto Entry") : undefined,
    number: entry.entry_number,
    date: entry.entry_date,
    extraFields: [
      { label: isRTL ? "الحالة" : "Status", value: entry.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : (isRTL ? "مسودة" : "Draft") },
      ...(entry.description ? [{ label: isRTL ? "البيان" : "Description", value: entry.description }] : []),
      ...(entry.reference_type ? [{ label: isRTL ? "المصدر" : "Source", value: entry.reference_type }] : []),
    ],
    table: {
      headers: ["#", isRTL ? "رمز الحساب" : "Code", isRTL ? "اسم الحساب" : "Account", isRTL ? "مدين" : "Debit", isRTL ? "دائن" : "Credit"],
      rows: lines.map((line: any, i: number) => [
        i + 1,
        line.accounts?.code || "-",
        currentLanguage === "en" ? (line.accounts?.name_en || line.accounts?.name || "-") : (line.accounts?.name || "-"),
        Number(line.debit) || 0,
        Number(line.credit) || 0,
      ]),
      totals: ["", "", isRTL ? "الإجمالي" : "Total", Number(entry.total_debit) || 0, Number(entry.total_credit) || 0],
    },
    notes: entry.description || undefined,
  } : null;

  const companyInfo: CompanyInfo = {
    name: company?.name || "",
    name_en: company?.name_en,
    logo_url: company?.logo_url,
    tax_number: company?.tax_number,
    commercial_register: company?.commercial_register,
    address: company?.address,
    phone: company?.phone,
    email: company?.email,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{isRTL ? "القيد غير موجود" : "Entry not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/client/journal")}>
          {isRTL ? "العودة" : "Go back"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/journal")}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "عرض القيد" : "View Journal Entry"}</h1>
            <p className="text-muted-foreground">{entry.entry_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!entry.is_auto && (
            <Button variant="outline" onClick={() => navigate(`/client/journal/${id}/edit`)}>
              {isRTL ? "تعديل" : "Edit"}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowPrint(true)} className="gap-2">
            <Printer className="h-4 w-4" />
            {isRTL ? "طباعة" : "Print"}
          </Button>
        </div>
      </div>

      {/* Entry Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {isRTL ? "بيانات القيد" : "Entry Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "رقم القيد" : "Entry Number"}</p>
              <p className="font-mono font-medium">{entry.entry_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</p>
              <p className="font-medium">{entry.entry_date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "الحالة" : "Status"}</p>
              <div className="flex items-center gap-2">
                <Badge variant={entry.status === "posted" ? "default" : "secondary"} className={entry.status === "posted" ? "bg-green-600" : ""}>
                  {entry.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : (isRTL ? "مسودة" : "Draft")}
                </Badge>
                {entry.is_auto && (
                  <Badge variant="outline" className="text-xs">{isRTL ? "آلي" : "Auto"}</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "البيان" : "Description"}</p>
              <p className="font-medium">{entry.description || "-"}</p>
            </div>
          </div>
          {entry.reference_type && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{isRTL ? "المصدر:" : "Source:"}</span>
              <Badge variant="secondary">
                {entry.reference_type === "receipt" ? (isRTL ? "سند قبض" : "Receipt") :
                 entry.reference_type === "payment" ? (isRTL ? "سند صرف" : "Payment") :
                 entry.reference_type === "deposit" ? (isRTL ? "إيداع" : "Deposit") :
                 entry.reference_type === "withdrawal" ? (isRTL ? "سحب" : "Withdrawal") :
                 entry.reference_type === "transfer" ? (isRTL ? "تحويل" : "Transfer") :
                 entry.reference_type === "reversal" ? (isRTL ? "عكس قيد" : "Reversal") :
                 entry.reference_type}
              </Badge>
              {entry.reference_id && (
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate("/client/treasury")}>
                  {isRTL ? "عرض العملية" : "View Transaction"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "بنود القيد" : "Entry Lines"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{isRTL ? "رمز الحساب" : "Account Code"}</TableHead>
                <TableHead>{isRTL ? "اسم الحساب" : "Account Name"}</TableHead>
                <TableHead>{isRTL ? "البيان" : "Description"}</TableHead>
                {lines?.some((l: any) => l.cost_center_id) && (
                  <TableHead>{isRTL ? "مركز التكلفة" : "Cost Center"}</TableHead>
                )}
                <TableHead>{t("client.journal.debit")}</TableHead>
                <TableHead>{t("client.journal.credit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines?.map((line: any, i: number) => (
                <TableRow key={line.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-mono">{line.accounts?.code || "-"}</TableCell>
                  <TableCell>
                    {currentLanguage === "en"
                      ? (line.accounts?.name_en || line.accounts?.name || "-")
                      : (line.accounts?.name || "-")}
                  </TableCell>
                  <TableCell>{line.description || "-"}</TableCell>
                  {lines?.some((l: any) => l.cost_center_id) && (
                    <TableCell>
                      {line.cost_centers
                        ? `${line.cost_centers.code} - ${isRTL ? line.cost_centers.name : (line.cost_centers.name_en || line.cost_centers.name)}`
                        : "-"}
                    </TableCell>
                  )}
                  <TableCell>{fmt(line.debit)} {currency}</TableCell>
                  <TableCell>{fmt(line.credit)} {currency}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={lines?.some((l: any) => l.cost_center_id) ? 5 : 4} className={isRTL ? "text-left" : "text-right"}>
                  {isRTL ? "الإجمالي" : "Total"}
                </TableCell>
                <TableCell>{fmt(entry.total_debit)} {currency}</TableCell>
                <TableCell>{fmt(entry.total_credit)} {currency}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Print Dialog */}
      {printDoc && (
        <PrintDialog
          open={showPrint}
          onClose={() => setShowPrint(false)}
          settings={settings}
          company={companyInfo}
          document={printDoc}
          isRTL={isRTL}
        />
      )}
    </div>
  );
};

export default ViewJournalEntry;
