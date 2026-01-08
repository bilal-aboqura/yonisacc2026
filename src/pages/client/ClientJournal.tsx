import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
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
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const entries: any[] = [];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "القيود اليومية" : "Journal Entries"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "تسجيل القيود المحاسبية اليومية" : "Record daily accounting entries"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/journal/new")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "قيد جديد" : "New Entry"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث برقم القيد أو البيان..." : "Search by entry number or description..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {isRTL ? "تصفية" : "Filter"}
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {isRTL ? "تصدير" : "Export"}
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
            {isRTL ? "سجل القيود" : "Entries Log"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد قيود بعد" : "No entries yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإنشاء أول قيد محاسبي" : "Start by creating your first journal entry"}
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {isRTL ? "إنشاء قيد" : "Create Entry"}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "رقم القيد" : "Entry #"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "البيان" : "Description"}</TableHead>
                  <TableHead>{isRTL ? "مدين" : "Debit"}</TableHead>
                  <TableHead>{isRTL ? "دائن" : "Credit"}</TableHead>
                  <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
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
                        {isRTL ? "عرض" : "View"}
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
