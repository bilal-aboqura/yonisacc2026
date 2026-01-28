import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Filter, Download, BookOpen } from "lucide-react";

const ClientJournal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const entries: any[] = [];

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
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {t("common.filter")}
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {t("common.export")}
              </Button>
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
          {entries.length === 0 ? (
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
                  <TableHead>{t("client.journal.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.number}</TableCell>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.debit} ر.س</TableCell>
                    <TableCell>{entry.credit} ر.س</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
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
