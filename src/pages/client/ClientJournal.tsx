import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Filter, Download, BookOpen, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

const ClientJournal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch company
  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("companies")
        .select("id, currency")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch journal entries
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
        <Button className="gap-2" onClick={() => navigate("/client/journal/new")}>
          <Plus className="h-4 w-4" />
          {t("client.journal.newEntry")}
        </Button>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("client.journal.entriesLog")}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("client.journal.entryNumber")}</TableHead>
                  <TableHead>{t("client.journal.date")}</TableHead>
                  <TableHead>{t("client.journal.description")}</TableHead>
                  <TableHead>{t("client.journal.debit")}</TableHead>
                  <TableHead>{t("client.journal.credit")}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{t("client.journal.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono font-medium">{entry.entry_number}</TableCell>
                    <TableCell>{entry.entry_date}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                    <TableCell>{formatNumber(entry.total_debit)} {currency}</TableCell>
                    <TableCell>{formatNumber(entry.total_credit)} {currency}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        {t("common.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientJournal;
