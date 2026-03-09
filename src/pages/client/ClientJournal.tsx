import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Search, BookOpen, Loader2, Eye, Edit, Trash2, Printer, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import PermissionGuard from "@/components/client/PermissionGuard";

const ClientJournal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteEntry, setDeleteEntry] = useState<{ id: string; number: string } | null>(null);

  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("companies")
        .select("id, currency, name")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["journal-entries", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, entry_number, entry_date, description, total_debit, total_credit, status, is_auto, reference_type")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // Delete lines first, then the entry
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .delete()
        .eq("entry_id", entryId);
      if (linesError) throw linesError;

      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast({
        title: isRTL ? "تم الحذف" : "Deleted",
        description: isRTL ? "تم حذف القيد بنجاح" : "Journal entry deleted successfully",
      });
      setDeleteEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error?.message || (isRTL ? "فشل في حذف القيد" : "Failed to delete entry"),
        variant: "destructive",
      });
    },
  });

  const postMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          posted_by: user?.id,
        })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast({
        title: isRTL ? "تم الترحيل" : "Posted",
        description: isRTL ? "تم ترحيل القيد بنجاح" : "Journal entry posted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error?.message || (isRTL ? "فشل في ترحيل القيد" : "Failed to post entry"),
        variant: "destructive",
      });
    },
  });

  const handlePrint = async (entryId: string) => {
    // Fetch entry details with lines for printing
    const [entryRes, linesRes] = await Promise.all([
      supabase.from("journal_entries").select("*").eq("id", entryId).single(),
      supabase
        .from("journal_entry_lines")
        .select("*, accounts:account_id(code, name, name_en)")
        .eq("entry_id", entryId)
        .order("sort_order"),
    ]);

    if (entryRes.error || linesRes.error) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "فشل في تحميل بيانات القيد" : "Failed to load entry data",
        variant: "destructive",
      });
      return;
    }

    const entry = entryRes.data;
    const lines = linesRes.data || [];
    const cur = isRTL ? "ر.س" : (company?.currency || "SAR");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dir = isRTL ? "rtl" : "ltr";
    const lang = isRTL ? "ar" : "en";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}" lang="${lang}">
      <head>
        <meta charset="utf-8" />
        <title>${entry.entry_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #333; direction: ${dir}; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
          .header h1 { font-size: 20px; margin-bottom: 4px; }
          .header p { color: #666; font-size: 13px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
          .info div { display: flex; flex-direction: column; gap: 4px; }
          .info span { color: #666; }
          .info strong { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f3f4f6; padding: 10px 12px; text-align: ${isRTL ? "right" : "left"}; font-size: 13px; border: 1px solid #ddd; }
          td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
          .totals td { font-weight: bold; background: #f9fafb; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${company?.name || ""}</h1>
          <p>${isRTL ? "قيد يومية" : "Journal Entry"}</p>
        </div>
        <div class="info">
          <div>
            <span>${isRTL ? "رقم القيد" : "Entry #"}</span>
            <strong>${entry.entry_number}</strong>
          </div>
          <div>
            <span>${isRTL ? "التاريخ" : "Date"}</span>
            <strong>${entry.entry_date}</strong>
          </div>
          <div>
            <span>${isRTL ? "الحالة" : "Status"}</span>
            <strong>${entry.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : (isRTL ? "مسودة" : "Draft")}</strong>
          </div>
        </div>
        ${entry.description ? `<p style="margin-bottom:16px;font-size:14px;"><strong>${isRTL ? "البيان:" : "Description:"}</strong> ${entry.description}</p>` : ""}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? "رمز الحساب" : "Account Code"}</th>
              <th>${isRTL ? "اسم الحساب" : "Account Name"}</th>
              <th>${isRTL ? "البيان" : "Description"}</th>
              <th>${isRTL ? "مدين" : "Debit"}</th>
              <th>${isRTL ? "دائن" : "Credit"}</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map((line: any, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td style="font-family:monospace">${line.accounts?.code || "-"}</td>
                <td>${isRTL ? (line.accounts?.name || "-") : (line.accounts?.name_en || line.accounts?.name || "-")}</td>
                <td>${line.description || "-"}</td>
                <td>${(line.debit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}</td>
                <td>${(line.credit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}</td>
              </tr>
            `).join("")}
            <tr class="totals">
              <td colspan="4" style="text-align:${isRTL ? "left" : "right"}">${isRTL ? "الإجمالي" : "Total"}</td>
              <td>${(entry.total_debit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}</td>
              <td>${(entry.total_credit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">${isRTL ? "تمت الطباعة بتاريخ" : "Printed on"}: ${new Date().toLocaleDateString(lang)}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const currency = isRTL ? "ر.س" : (company?.currency || "SAR");

  const filtered = entries?.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.entry_number?.toLowerCase().includes(term) ||
      e.description?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string | null) => {
    if (status === "posted") {
      return <Badge variant="default" className="bg-green-600">{isRTL ? "مرحّل" : "Posted"}</Badge>;
    }
    return <Badge variant="secondary">{isRTL ? "مسودة" : "Draft"}</Badge>;
  };

  const formatNumber = (num: number | null) => {
    return (num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t("client.journal.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("client.journal.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="CREATE_JOURNAL">
          <Button className="gap-2" onClick={() => navigate("/client/journal/new")}>
            <Plus className="h-4 w-4" />
            {t("client.journal.newEntry")}
          </Button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("client.journal.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("client.journal.entriesLog")}
            {filtered && <Badge variant="secondary" className="ms-2 font-medium">{filtered.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filtered?.length ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t("client.journal.noEntries")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("client.journal.noEntriesDescription")}
              </p>
              <Button className="gap-2" onClick={() => navigate("/client/journal/new")}>
                <Plus className="h-4 w-4" />
                {t("client.journal.createEntry")}
              </Button>
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">{t("client.journal.entryNumber")}</TableHead>
                    <TableHead className="w-[110px]">{t("client.journal.date")}</TableHead>
                    <TableHead>{t("client.journal.description")}</TableHead>
                    <TableHead className="w-[130px] text-end">{t("client.journal.debit")}</TableHead>
                    <TableHead className="w-[130px] text-end">{t("client.journal.credit")}</TableHead>
                    <TableHead className="w-[90px] text-center">{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="w-[140px] text-center">{t("client.journal.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry, idx) => (
                    <TableRow key={entry.id} className={`group ${idx % 2 === 1 ? "bg-muted/30" : ""}`}>
                      <TableCell className="font-mono font-medium text-primary">{entry.entry_number}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.entry_date}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="text-end font-medium tabular-nums">{formatNumber(entry.total_debit)} <span className="text-xs text-muted-foreground">{currency}</span></TableCell>
                      <TableCell className="text-end font-medium tabular-nums">{formatNumber(entry.total_credit)} <span className="text-xs text-muted-foreground">{currency}</span></TableCell>
                      <TableCell className="text-center">{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => navigate(`/client/journal/${entry.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
                          </Tooltip>

                          {!entry.is_auto && (
                            <PermissionGuard permission="EDIT_JOURNAL">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => navigate(`/client/journal/${entry.id}/edit`)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
                              </Tooltip>
                            </PermissionGuard>
                          )}

                          {!entry.is_auto && entry.status === 'draft' && (
                            <PermissionGuard permission="CREATE_JOURNAL">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-green-600" 
                                    onClick={() => postMutation.mutate(entry.id)}
                                    disabled={postMutation.isPending}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{isRTL ? "ترحيل" : "Post"}</TooltipContent>
                              </Tooltip>
                            </PermissionGuard>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handlePrint(entry.id)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isRTL ? "طباعة" : "Print"}</TooltipContent>
                          </Tooltip>

                          {!entry.is_auto && (
                            <PermissionGuard permission="DELETE_JOURNAL">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteEntry({ id: entry.id, number: entry.entry_number })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{isRTL ? "حذف" : "Delete"}</TooltipContent>
                              </Tooltip>
                            </PermissionGuard>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-sm">{isRTL ? "الإجمالي" : "Total"}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatNumber(filtered.reduce((s, e) => s + (e.total_debit || 0), 0))}
                      <span className="text-xs text-muted-foreground ms-1">{currency}</span>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatNumber(filtered.reduce((s, e) => s + (e.total_credit || 0), 0))}
                      <span className="text-xs text-muted-foreground ms-1">{currency}</span>
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </Table>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تأكيد الحذف" : "Confirm Deletion"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف القيد رقم "${deleteEntry?.number}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete entry "${deleteEntry?.number}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEntry && deleteMutation.mutate(deleteEntry.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 me-2" />
              )}
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientJournal;
