import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText, Loader2 } from "lucide-react";

const actionLabels: Record<string, [string, string, string]> = {
  create: ["إنشاء", "Create", "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"],
  lock: ["قفل مؤقت", "Lock", "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"],
  unlock: ["فك القفل", "Unlock", "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"],
  close: ["إقفال", "Close", "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"],
  reopen: ["إعادة فتح", "Reopen", "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"],
};

const FiscalAuditLog = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["fiscal-audit-logs", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fiscal_year_audit_log")
        .select("*, fiscal_periods:fiscal_year_id(name, name_en)")
        .eq("company_id", companyId)
        .order("performed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          {isRTL ? "سجل تدقيق السنوات المالية" : "Fiscal Year Audit Log"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? "لا توجد سجلات" : "No audit logs"}
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "السنة المالية" : "Fiscal Year"}</TableHead>
                  <TableHead>{isRTL ? "الإجراء" : "Action"}</TableHead>
                  <TableHead>{isRTL ? "الملاحظات" : "Notes"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => {
                  const al = actionLabels[log.action] || [log.action, log.action, ""];
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.performed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {isRTL ? log.fiscal_periods?.name : (log.fiscal_periods?.name_en || log.fiscal_periods?.name)}
                      </TableCell>
                      <TableCell>
                        <Badge className={al[2]} variant="secondary">
                          {isRTL ? al[0] : al[1]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {log.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FiscalAuditLog;
