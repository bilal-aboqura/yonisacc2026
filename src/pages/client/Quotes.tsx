import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Eye, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const Quotes = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompanyId();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, contacts(name, name_en)")
        .eq("company_id", companyId!)
        .eq("type", "quote")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const filtered = quotes.filter((q) =>
    q.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.contacts?.name && q.contacts.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statusBadge = (status: string | null) => {
    const map: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", labelAr: "مسودة", variant: "secondary" },
      sent: { label: "Sent", labelAr: "مرسل", variant: "default" },
      accepted: { label: "Accepted", labelAr: "مقبول", variant: "default" },
      rejected: { label: "Rejected", labelAr: "مرفوض", variant: "destructive" },
      converted: { label: "Converted", labelAr: "محوّل", variant: "outline" },
    };
    const s = map[status || "draft"] || map.draft;
    return <Badge variant={s.variant}>{isRTL ? s.labelAr : s.label}</Badge>;
  };

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "عروض الأسعار" : "Quotations"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة عروض الأسعار للعملاء" : "Manage customer quotations"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/quotes/new")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "عرض سعر جديد" : "New Quote"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? "قائمة عروض الأسعار" : "Quotes List"}
            <Badge variant="secondary" className="ms-2">{filtered.length}</Badge>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث برقم العرض أو اسم العميل..." : "Search by quote number or customer..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد عروض أسعار بعد" : "No quotes yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? "ابدأ بإنشاء أول عرض سعر" : "Start by creating your first quote"}
              </p>
              <Button className="gap-2" onClick={() => navigate("/client/quotes/new")}>
                <Plus className="h-4 w-4" />
                {isRTL ? "إنشاء عرض سعر" : "Create Quote"}
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "رقم العرض" : "Quote #"}</TableHead>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                    <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.invoice_number}</TableCell>
                      <TableCell>{quote.invoice_date}</TableCell>
                      <TableCell>
                        {quote.contacts
                          ? (isRTL ? quote.contacts.name : (quote.contacts.name_en || quote.contacts.name))
                          : "-"}
                      </TableCell>
                      <TableCell>{(quote.total ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{statusBadge(quote.status)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/client/invoices/${quote.id}`)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "عرض" : "View"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{isRTL ? "تعديل" : "Edit"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotes;
