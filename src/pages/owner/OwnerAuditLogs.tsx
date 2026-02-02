import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Search, 
  Filter, 
  Download,
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string;
  operation_type: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  severity: string;
  details: string | null;
  created_at: string;
}

const OwnerAuditLogs = () => {
  const { isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [operationFilter, setOperationFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", operationFilter, severityFilter, tableFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (operationFilter !== "all") {
        query = query.eq("operation_type", operationFilter);
      }
      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }
      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Get unique table names for filter
  const { data: tableNames } = useQuery({
    queryKey: ["audit-log-tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("table_name")
        .limit(1000);
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.table_name))];
      return unique.sort();
    },
  });

  const filteredLogs = auditLogs?.filter((log) =>
    searchTerm
      ? log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-primary" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
      critical: "destructive",
      error: "destructive",
      warning: "secondary",
      info: "outline",
    };
    return (
      <Badge variant={variants[severity] || "outline"} className="gap-1">
        {getSeverityIcon(severity)}
        {severity}
      </Badge>
    );
  };

  const getOperationBadge = (operation: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
      SELECT: "outline",
      ACCESS_DENIED: "destructive",
      EXPORT: "secondary",
    };
    return (
      <Badge variant={variants[operation] || "outline"}>
        {operation}
      </Badge>
    );
  };

  const handleExport = () => {
    if (!filteredLogs) return;
    
    const csvContent = [
      ["ID", "Timestamp", "Operation", "Table", "Severity", "User ID", "Company ID", "Record ID", "Details"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.id,
          log.created_at,
          log.operation_type,
          log.table_name,
          log.severity,
          log.user_id,
          log.company_id || "",
          log.record_id || "",
          `"${log.details?.replace(/"/g, '""') || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            {isRTL ? "سجل التدقيق الأمني" : "Security Audit Logs"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL
              ? "تتبع جميع العمليات الحساسة في النظام"
              : "Track all sensitive operations in the system"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {isRTL ? "تحديث" : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 me-2" />
            {isRTL ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "البحث في السجلات..." : "Search logs..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={operationFilter} onValueChange={setOperationFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={isRTL ? "العملية" : "Operation"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                <SelectItem value="INSERT">{isRTL ? "إضافة" : "INSERT"}</SelectItem>
                <SelectItem value="UPDATE">{isRTL ? "تعديل" : "UPDATE"}</SelectItem>
                <SelectItem value="DELETE">{isRTL ? "حذف" : "DELETE"}</SelectItem>
                <SelectItem value="ACCESS_DENIED">{isRTL ? "وصول مرفوض" : "ACCESS_DENIED"}</SelectItem>
                <SelectItem value="EXPORT">{isRTL ? "تصدير" : "EXPORT"}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={isRTL ? "الخطورة" : "Severity"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                <SelectItem value="info">{isRTL ? "معلومات" : "Info"}</SelectItem>
                <SelectItem value="warning">{isRTL ? "تحذير" : "Warning"}</SelectItem>
                <SelectItem value="error">{isRTL ? "خطأ" : "Error"}</SelectItem>
                <SelectItem value="critical">{isRTL ? "حرج" : "Critical"}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={isRTL ? "الجدول" : "Table"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                {tableNames?.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {filteredLogs?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRTL ? "إجمالي السجلات" : "Total Logs"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {filteredLogs?.filter((l) => l.severity === "critical").length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRTL ? "أحداث حرجة" : "Critical Events"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {filteredLogs?.filter((l) => l.operation_type === "ACCESS_DENIED").length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRTL ? "وصول مرفوض" : "Access Denied"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {filteredLogs?.filter((l) => l.operation_type === "INSERT").length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRTL ? "إضافات" : "Inserts"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {isRTL ? "سجل العمليات" : "Operations Log"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "التاريخ" : "Timestamp"}</TableHead>
                    <TableHead>{isRTL ? "العملية" : "Operation"}</TableHead>
                    <TableHead>{isRTL ? "الجدول" : "Table"}</TableHead>
                    <TableHead>{isRTL ? "الخطورة" : "Severity"}</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {isRTL ? "معرف المستخدم" : "User ID"}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {isRTL ? "التفاصيل" : "Details"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss", {
                          locale: isRTL ? ar : enUS,
                        })}
                      </TableCell>
                      <TableCell>{getOperationBadge(log.operation_type)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {log.table_name}
                        </code>
                      </TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <code className="text-xs">
                          {log.user_id.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {log.details || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{isRTL ? "لا توجد سجلات" : "No logs found"}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerAuditLogs;
