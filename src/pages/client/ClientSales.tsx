import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Download, FileText } from "lucide-react";

const ClientSales = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Placeholder data - will be connected to database later
  const invoices: any[] = [];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "فواتير المبيعات" : "Sales Invoices"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة فواتير المبيعات والعملاء" : "Manage sales invoices and customers"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/sales/new")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "فاتورة جديدة" : "New Invoice"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث برقم الفاتورة أو اسم العميل..." : "Search by invoice number or customer..."}
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

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? "قائمة الفواتير" : "Invoices List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد فواتير بعد" : "No invoices yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإنشاء أول فاتورة مبيعات" : "Start by creating your first sales invoice"}
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {isRTL ? "إنشاء فاتورة" : "Create Invoice"}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                  <TableHead>{t("common.amount")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.customer}</TableCell>
                    <TableCell>{invoice.amount} {t("common.currency")}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                        {invoice.status === "paid" ? (isRTL ? "مدفوعة" : "Paid") : (isRTL ? "معلقة" : "Pending")}
                      </Badge>
                    </TableCell>
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

export default ClientSales;
