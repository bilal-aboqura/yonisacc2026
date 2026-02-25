import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRight, BookOpen, Loader2, Printer, Pencil, Undo2, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const typeLabels: Record<string, { ar: string; en: string }> = {
  receipt: { ar: "سند قبض", en: "Receipt" },
  payment: { ar: "سند صرف", en: "Payment" },
  deposit: { ar: "إيداع", en: "Deposit" },
  withdrawal: { ar: "سحب", en: "Withdrawal" },
  transfer: { ar: "تحويل", en: "Transfer" },
};

const ViewTreasuryTransaction = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showReverse, setShowReverse] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("companies").select("id, currency").eq("owner_id", user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: tx, isLoading } = useQuery({
    queryKey: ["treasury-tx", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("treasury_transactions")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: journalEntry } = useQuery({
    queryKey: ["treasury-journal", tx?.journal_entry_id],
    queryFn: async () => {
      if (!tx?.journal_entry_id) return null;
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", tx.journal_entry_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tx?.journal_entry_id,
  });

  const { data: journalLines } = useQuery({
    queryKey: ["treasury-journal-lines", tx?.journal_entry_id],
    queryFn: async () => {
      if (!tx?.journal_entry_id) return [];
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("*, accounts:account_id(code, name, name_en)")
        .eq("entry_id", tx.journal_entry_id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tx?.journal_entry_id,
  });

  const { data: contact } = useQuery({
    queryKey: ["treasury-contact", tx?.contact_id],
    queryFn: async () => {
      if (!tx?.contact_id) return null;
      const { data } = await supabase.from("contacts").select("name, name_en, type").eq("id", tx.contact_id).single();
      return data;
    },
    enabled: !!tx?.contact_id,
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("reverse_treasury_transaction", {
        p_company_id: company!.id,
        p_transaction_id: id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: isRTL ? "تم العكس بنجاح" : "Reversed successfully" });
      queryClient.invalidateQueries({ queryKey: ["treasury-tx", id] });
      queryClient.invalidateQueries({ queryKey: ["treasury-overview"] });
      setShowReverse(false);
    },
    onError: (e: any) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: e?.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete journal lines, journal entry, then transaction
      if (tx?.journal_entry_id) {
        await supabase.from("journal_entry_lines").delete().eq("entry_id", tx.journal_entry_id);
        await supabase.from("journal_entries").delete().eq("id", tx.journal_entry_id);
      }
      const { error } = await supabase.from("treasury_transactions").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: isRTL ? "تم الحذف النهائي" : "Permanently deleted" });
      queryClient.invalidateQueries({ queryKey: ["treasury-overview"] });
      navigate("/client/treasury");
    },
    onError: (e: any) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: e?.message, variant: "destructive" });
    },
  });

  const fmt = (n: number | null) => (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currency = isRTL ? "ر.س" : (company?.currency || "SAR");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{isRTL ? "العملية غير موجودة" : "Transaction not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/client/treasury")}>
          {isRTL ? "العودة" : "Go back"}
        </Button>
      </div>
    );
  }

  const typeLabel = isRTL ? typeLabels[tx.type]?.ar || tx.type : typeLabels[tx.type]?.en || tx.type;
  const isReversed = tx.status === "reversed";

  return (
    <div className={`space-y-6 print:space-y-4 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/treasury")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? "تفاصيل العملية" : "Transaction Details"}</h1>
            <p className="text-muted-foreground font-mono">{tx.transaction_number}</p>
          </div>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="flex gap-1">
            {!isReversed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => navigate(`/client/treasury/${id}/edit`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
              </Tooltip>
            )}
            {!isReversed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setShowReverse(true)}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? "عكس العملية" : "Reverse"}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? "طباعة" : "Print"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => navigate(`/client/treasury/new?type=${tx.type}`)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? "نسخ كعملية جديدة" : "Copy as new"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? "حذف نهائي" : "Delete permanently"}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">{typeLabel}</h1>
        <p className="text-sm">{tx.transaction_number}</p>
      </div>

      {/* Transaction Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRTL ? "بيانات العملية" : "Transaction Info"}
            {isReversed && <Badge variant="outline" className="text-xs">{isRTL ? "معكوس" : "Reversed"}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "رقم العملية" : "Transaction #"}</p>
              <p className="font-mono font-medium">{tx.transaction_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "النوع" : "Type"}</p>
              <Badge variant="secondary">{typeLabel}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</p>
              <p className="font-medium">{tx.transaction_date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "المبلغ" : "Amount"}</p>
              <p className="text-2xl font-bold">{fmt(Number(tx.amount))} {currency}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {contact && (
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "الجهة" : "Contact"}</p>
                <p className="font-medium">{isRTL ? contact.name : (contact.name_en || contact.name)}</p>
              </div>
            )}
            {tx.description && (
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "البيان" : "Description"}</p>
                <p className="font-medium">{tx.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{isRTL ? "الحالة" : "Status"}</p>
              <Badge variant={isReversed ? "outline" : "default"} className={!isReversed ? "bg-green-600" : ""}>
                {isReversed ? (isRTL ? "معكوس" : "Reversed") : (isRTL ? "مرحّل" : "Posted")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Entry */}
      {journalEntry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {isRTL ? "القيد المحاسبي" : "Journal Entry"}
              <Badge variant="secondary" className="font-mono">{journalEntry.entry_number}</Badge>
              <Button variant="link" size="sm" className="h-auto p-0 print:hidden" onClick={() => navigate(`/client/journal/${journalEntry.id}`)}>
                {isRTL ? "عرض القيد" : "View Entry"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{isRTL ? "رمز الحساب" : "Code"}</TableHead>
                  <TableHead>{isRTL ? "اسم الحساب" : "Account"}</TableHead>
                  <TableHead>{isRTL ? "مدين" : "Debit"}</TableHead>
                  <TableHead>{isRTL ? "دائن" : "Credit"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines?.map((line: any, i: number) => (
                  <TableRow key={line.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono">{line.accounts?.code || "-"}</TableCell>
                    <TableCell>{isRTL ? (line.accounts?.name || "-") : (line.accounts?.name_en || line.accounts?.name || "-")}</TableCell>
                    <TableCell>{fmt(line.debit)} {currency}</TableCell>
                    <TableCell>{fmt(line.credit)} {currency}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className={isRTL ? "text-left" : "text-right"}>
                    {isRTL ? "الإجمالي" : "Total"}
                  </TableCell>
                  <TableCell>{fmt(journalEntry.total_debit)} {currency}</TableCell>
                  <TableCell>{fmt(journalEntry.total_credit)} {currency}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Reverse Dialog */}
      <AlertDialog open={showReverse} onOpenChange={setShowReverse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "عكس العملية" : "Reverse Transaction"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل تريد عكس العملية ${tx.transaction_number}؟ سيتم إنشاء قيد عكسي تلقائياً.`
                : `Reverse ${tx.transaction_number}? A reversing journal entry will be created.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => reverseMutation.mutate()}>
              {reverseMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              {isRTL ? "عكس" : "Reverse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "حذف نهائي" : "Permanent Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `هل أنت متأكد من حذف العملية ${tx.transaction_number} نهائياً؟ سيتم حذف القيد المحاسبي المرتبط. هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to permanently delete ${tx.transaction_number}? The linked journal entry will also be deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              {isRTL ? "حذف نهائي" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ViewTreasuryTransaction;
