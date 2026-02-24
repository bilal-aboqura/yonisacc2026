import * as React from "react";
import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreVertical, Plus, Download, Filter, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnAlign = "start" | "center" | "end";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Render cell content. Falls back to row[key] */
  render?: (row: T, index: number) => React.ReactNode;
  align?: ColumnAlign;
  /** Fixed width in px */
  width?: number;
  /** Hide on mobile cards */
  hideOnMobile?: boolean;
  /** Is this a numeric/amount column? Auto-aligns end + tabular-nums */
  numeric?: boolean;
  /** CSS class for the cell */
  className?: string;
}

export interface DataTableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
  /** Optional separator before this action */
  separator?: boolean;
}

export interface StatusConfig {
  label: string;
  variant: "success" | "warning" | "destructive" | "info" | "secondary" | "default" | "outline";
}

export interface DataTableProps<T> {
  /** Table title */
  title: string;
  /** Title icon */
  icon?: React.ReactNode;
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Data rows */
  data: T[];
  /** Loading state */
  isLoading?: boolean;
  /** Row key accessor */
  rowKey: (row: T) => string;
  /** Row actions dropdown */
  actions?: DataTableAction<T>[];
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search filter function */
  onSearch?: (row: T, term: string) => boolean;
  /** Create button config */
  createButton?: {
    label: string;
    onClick: () => void;
  };
  /** Export button */
  onExport?: () => void;
  /** Filter button */
  onFilter?: () => void;
  /** Empty state config */
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  /** Extra header content (right side) */
  headerExtra?: React.ReactNode;
  /** Pagination: page sizes. Pass empty to disable. Default: [10,25,50] */
  pageSizes?: number[];
}

// ─── Status Badge Helper ──────────────────────────────────────────────────────

const variantClassMap: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  destructive: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  secondary: "bg-muted text-muted-foreground border-border",
  default: "bg-primary/10 text-primary border-primary/20",
  outline: "bg-transparent text-muted-foreground border-border",
};

export function StatusBadge({ config }: { config: StatusConfig }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantClassMap[config.variant] || variantClassMap.default
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  title,
  icon,
  columns,
  data,
  isLoading = false,
  rowKey,
  actions,
  searchPlaceholder,
  onSearch,
  createButton,
  onExport,
  onFilter,
  emptyState,
  headerExtra,
  pageSizes = [10, 25, 50],
}: DataTableProps<T>) {
  const { isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(pageSizes[0] || 10);

  // Filter data
  const filtered = useMemo(() => {
    if (!searchTerm || !onSearch) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((row) => onSearch(row, lower));
  }, [data, searchTerm, onSearch]);

  // Paginate
  const enablePagination = pageSizes.length > 0;
  const totalPages = enablePagination ? Math.ceil(filtered.length / pageSize) : 1;
  const paginatedData = enablePagination
    ? filtered.slice(page * pageSize, (page + 1) * pageSize)
    : filtered;

  // Reset page on search
  React.useEffect(() => { setPage(0); }, [searchTerm]);

  const hasActions = actions && actions.length > 0;

  const alignClass = (col: DataTableColumn<T>) => {
    if (col.numeric) return "text-end tabular-nums";
    if (col.align === "center") return "text-center";
    if (col.align === "end") return "text-end";
    return "text-start";
  };

  // ─── Mobile Card Layout ─────────────────────────────────────────────────
  const renderMobileCards = () => (
    <div className="space-y-3">
      {paginatedData.map((row, rowIdx) => (
        <div
          key={rowKey(row)}
          className="rounded-xl border bg-card p-4 space-y-3 transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              {columns.filter((c) => !c.hideOnMobile).slice(0, 2).map((col) => (
                <div key={col.key}>
                  {col.key === columns[0]?.key ? (
                    <p className="font-semibold text-foreground truncate">
                      {col.render ? col.render(row, rowIdx) : (row as any)[col.key]}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground truncate">
                      {col.render ? col.render(row, rowIdx) : (row as any)[col.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                  {actions!.map((action, i) => (
                    <React.Fragment key={i}>
                      {action.separator && i > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => action.onClick(row)}
                        className={cn(
                          "gap-2 cursor-pointer",
                          action.variant === "destructive" && "text-destructive focus:text-destructive"
                        )}
                      >
                        {action.icon}
                        {action.label}
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {columns.filter((c) => !c.hideOnMobile).slice(2).map((col) => (
              <div key={col.key}>
                <p className="text-xs text-muted-foreground">{col.header}</p>
                <p className={cn("text-sm font-medium", col.numeric && "tabular-nums")}>
                  {col.render ? col.render(row, rowIdx) : ((row as any)[col.key] ?? "-")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Desktop Table ──────────────────────────────────────────────────────
  const renderDesktopTable = () => (
    <div className="overflow-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 dark:bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap border-b border-border/50",
                  alignClass(col),
                  col.className
                )}
                style={col.width ? { width: col.width, minWidth: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
            {hasActions && (
              <th
                className="px-4 py-3 font-semibold text-muted-foreground text-center border-b border-border/50"
                style={{ width: 60, minWidth: 60 }}
              >
                {isRTL ? "" : ""}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, rowIdx) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "transition-colors duration-150",
                "hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06]",
                rowIdx % 2 === 1 && "bg-muted/20 dark:bg-muted/10"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3.5 border-b border-border/30 whitespace-nowrap",
                    alignClass(col),
                    col.className
                  )}
                >
                  {col.render ? col.render(row, rowIdx) : ((row as any)[col.key] ?? "-")}
                </td>
              ))}
              {hasActions && (
                <td className="px-4 py-3.5 border-b border-border/30 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 mx-auto hover:bg-muted">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                      {actions!.map((action, i) => (
                        <React.Fragment key={i}>
                          {action.separator && i > 0 && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            onClick={() => action.onClick(row)}
                            className={cn(
                              "gap-2 cursor-pointer",
                              action.variant === "destructive" && "text-destructive focus:text-destructive"
                            )}
                          >
                            {action.icon}
                            {action.label}
                          </DropdownMenuItem>
                        </React.Fragment>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ─── Skeleton ───────────────────────────────────────────────────────────
  const renderSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );

  // ─── Empty State ────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-2xl bg-muted/50 p-5 mb-5">
        {emptyState?.icon || <Database className="h-10 w-10 text-muted-foreground/60" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {emptyState?.title || (isRTL ? "لا توجد بيانات" : "No data available")}
      </h3>
      {emptyState?.description && (
        <p className="text-sm text-muted-foreground mb-5 max-w-sm">{emptyState.description}</p>
      )}
      {emptyState?.onAction && emptyState?.actionLabel && (
        <Button onClick={emptyState.onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {emptyState.actionLabel}
        </Button>
      )}
    </div>
  );

  // ─── Pagination ─────────────────────────────────────────────────────────
  const renderPagination = () => {
    if (!enablePagination || filtered.length === 0) return null;
    const from = page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, filtered.length);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-1">
        <p className="text-xs text-muted-foreground">
          {isRTL
            ? `عرض ${from} - ${to} من ${filtered.length}`
            : `Showing ${from} - ${to} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <div className="flex items-center px-2 text-xs text-muted-foreground min-w-[60px] justify-center">
              {page + 1} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
            <Badge variant="secondary" className="ms-1 text-xs font-normal">
              {filtered.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {headerExtra}
            {onFilter && (
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={onFilter}>
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isRTL ? "فلترة" : "Filter"}</span>
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={onExport}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isRTL ? "تصدير" : "Export"}</span>
              </Button>
            )}
            {createButton && (
              <Button size="sm" className="gap-1.5 h-9" onClick={createButton.onClick}>
                <Plus className="h-3.5 w-3.5" />
                {createButton.label}
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        {onSearch && (
          <div className="relative mt-3">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder || (isRTL ? "بحث..." : "Search...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10 h-10 bg-muted/30 border-border/50 focus:bg-card"
            />
          </div>
        )}
      </CardHeader>

      {/* Body */}
      <CardContent className="pt-0">
        {isLoading
          ? renderSkeleton()
          : filtered.length === 0
          ? renderEmpty()
          : isMobile
          ? renderMobileCards()
          : renderDesktopTable()}

        {renderPagination()}
      </CardContent>
    </Card>
  );
}

export default DataTable;
