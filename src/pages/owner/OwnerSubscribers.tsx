import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Building2, Eye, Pause, Ban, Trash2, Mail, Phone, Calendar,
  MapPin, Archive, RotateCcw, KeyRound, Loader2, UserPlus, EyeOff,
  MoreVertical, ShieldCheck, Package, Settings2, Users,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

const isStrongPassword = (pw: string) =>
  pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(pw);

const statusConfig: Record<string, { color: string; labelAr: string; labelEn: string }> = {
  trialing: { color: "bg-blue-500/10 text-blue-600 border-blue-200", labelAr: "تجريبي", labelEn: "Trialing" },
  active: { color: "bg-green-500/10 text-green-600 border-green-200", labelAr: "نشط", labelEn: "Active" },
  past_due: { color: "bg-orange-500/10 text-orange-600 border-orange-200", labelAr: "متأخر", labelEn: "Past Due" },
  suspended: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", labelAr: "موقوف", labelEn: "Suspended" },
  terminated: { color: "bg-red-500/10 text-red-600 border-red-200", labelAr: "منهي", labelEn: "Terminated" },
  cancelled: { color: "bg-gray-500/10 text-gray-500 border-gray-200", labelAr: "ملغي", labelEn: "Cancelled" },
  pending: { color: "bg-amber-500/10 text-amber-600 border-amber-200", labelAr: "معلق", labelEn: "Pending" },
  expired: { color: "bg-gray-500/10 text-gray-500 border-gray-200", labelAr: "منتهي", labelEn: "Expired" },
  none: { color: "bg-muted text-muted-foreground border-border", labelAr: "بدون", labelEn: "None" },
};

const OwnerSubscribers = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewCompany, setViewCompany] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "terminate" | "delete"; company: any } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [restoreCompany, setRestoreCompany] = useState<any>(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false); // kept for legacy reference
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id, name_ar, name_en, price, duration_months")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const resetNewSub = () => {
    setNewSub({
      email: "", password: "", company_name: "", company_name_en: "",
      full_name: "", phone: "", plan_id: "", activity_type: "",
      tax_number: "", commercial_register: "", address: "",
    });
    setShowNewPassword(false);
  };

  const createSubscriberMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("create-subscriber", { body: newSub });
      if (response.error) throw new Error(response.error.message || "Failed");
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["owner-subscribers"] });
      toast({
        title: isRTL ? "تم إنشاء المشترك" : "Subscriber Created",
        description: isRTL ? `تم إنشاء حساب ${data.email} بنجاح` : `Account ${data.email} created successfully`,
      });
      setShowAddDialog(false);
      resetNewSub();
    },
    onError: (error: Error) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["owner-subscribers", search, page, showArchived],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select(`*, subscriptions:subscriptions(id, status, start_date, end_date, plan:subscription_plans(name_ar, name_en, price))`, { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (showArchived) {
        query = query.not("deleted_at", "is", null);
      } else {
        query = query.is("deleted_at", null);
      }
      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,name_en.ilike.%${search}%`);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { companies: data || [], total: count || 0 };
    },
  });

  const companies = data?.companies || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const actionMutation = useMutation({
    mutationFn: async ({ type, companyId, subscriptionId }: { type: string; companyId: string; subscriptionId?: string }) => {
      if (type === "delete") {
        const response = await supabase.functions.invoke("delete-subscriber", { body: { companyId } });
        if (response.error) throw new Error(response.error.message || "Delete failed");
        if (response.data?.error) throw new Error(response.data.error);
      } else if (type === "suspend" || type === "terminate") {
        if (subscriptionId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: type === "suspend" ? "suspended" : "terminated" } as any)
            .eq("id", subscriptionId);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-subscribers"] });
      toast({
        title: isRTL ? "تم التنفيذ" : "Action completed",
        description: isRTL ? "تم تحديث حالة المشترك بنجاح" : "Subscriber status updated successfully",
      });
      setConfirmAction(null);
    },
    onError: () => {
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "حدث خطأ" : "An error occurred", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ companyId, newPassword }: { companyId: string; newPassword: string }) => {
      const response = await supabase.functions.invoke("restore-subscriber", { body: { companyId, newPassword } });
      if (response.error) throw new Error(response.error.message || "Restore failed");
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["owner-subscribers"] });
      toast({
        title: isRTL ? "تم الاستعادة" : "Restored",
        description: isRTL ? `تم استعادة الحساب بنجاح. البريد: ${data.email}` : `Account restored. Email: ${data.email}`,
      });
      setRestoreCompany(null);
      setRestorePassword("");
    },
    onError: (error: Error) => {
      toast({ title: isRTL ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    },
  });

  const getActiveSubscription = (subs: any[]) => {
    if (!subs?.length) return null;
    return subs.find((s) => s.status === "active") || subs.find((s) => s.status === "trialing") || subs[0];
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const sub = getActiveSubscription(confirmAction.company.subscriptions || []);
    actionMutation.mutate({ type: confirmAction.type, companyId: confirmAction.company.id, subscriptionId: sub?.id });
  };

  const confirmMessages: Record<string, { titleAr: string; titleEn: string; descAr: string; descEn: string }> = {
    suspend: { titleAr: "تعليق الاشتراك", titleEn: "Suspend Subscription", descAr: "هل أنت متأكد من تعليق هذا الاشتراك؟", descEn: "Are you sure you want to suspend this subscription?" },
    terminate: { titleAr: "إنهاء الاشتراك", titleEn: "Terminate Subscription", descAr: "هل أنت متأكد من إنهاء هذا الاشتراك؟", descEn: "Are you sure you want to terminate this subscription?" },
    delete: { titleAr: "حذف المشترك", titleEn: "Delete Subscriber", descAr: "سيتم أرشفة الشركة وتحرير البريد الإلكتروني.", descEn: "The company will be archived and the email freed." },
  };

  // Stats
  const activeCount = companies.filter((c: any) => {
    const sub = getActiveSubscription(c.subscriptions || []);
    return sub?.status === "active";
  }).length;
  const trialingCount = companies.filter((c: any) => {
    const sub = getActiveSubscription(c.subscriptions || []);
    return sub?.status === "trialing";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{isRTL ? "المشتركين" : "Subscribers"}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة الشركات والصلاحيات والوحدات المتاحة" : "Manage companies, permissions & available modules"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => { resetNewSub(); setShowAddDialog(true); }}>
          <UserPlus className="h-4 w-4" />
          {isRTL ? "إضافة مشترك" : "Add Subscriber"}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: isRTL ? "إجمالي الشركات" : "Total Companies", value: data?.total || 0, color: "text-primary", bg: "bg-primary/10" },
          { icon: Users, label: isRTL ? "نشط" : "Active", value: activeCount, color: "text-green-600", bg: "bg-green-500/10" },
          { icon: Package, label: isRTL ? "تجريبي" : "Trial", value: trialingCount, color: "text-blue-600", bg: "bg-blue-500/10" },
          { icon: Archive, label: isRTL ? "مؤرشف" : "Archived", value: showArchived ? companies.length : "—", color: "text-muted-foreground", bg: "bg-muted" },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="ps-10"
              />
            </div>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => { setShowArchived(!showArchived); setPage(1); }}
            >
              <Archive className="h-4 w-4" />
              {isRTL ? "المؤرشفين" : "Archived"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="min-w-[200px]">{isRTL ? "الشركة" : "Company"}</TableHead>
                  <TableHead className="min-w-[140px] hidden sm:table-cell">{isRTL ? "البريد الإلكتروني" : "Email"}</TableHead>
                  <TableHead className="min-w-[100px] hidden md:table-cell">{isRTL ? "نوع النشاط" : "Activity"}</TableHead>
                  <TableHead className="min-w-[100px]">{isRTL ? "الباقة" : "Plan"}</TableHead>
                  <TableHead className="min-w-[80px]">{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="min-w-[100px] hidden lg:table-cell">{isRTL ? "التسجيل" : "Created"}</TableHead>
                  <TableHead className="w-[60px]">{isRTL ? "إجراء" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j} className={j === 1 ? "hidden sm:table-cell" : j === 2 ? "hidden md:table-cell" : j === 5 ? "hidden lg:table-cell" : ""}>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {isRTL ? "لا توجد شركات مسجلة" : "No companies found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company: any) => {
                    const sub = getActiveSubscription(company.subscriptions || []);
                    const status: string = sub?.status || "none";
                    const cfg = statusConfig[status] || statusConfig.none;
                    const isTerminated = status === "terminated";
                    const isArchived = !!company.deleted_at;

                    return (
                      <TableRow key={company.id} className={isTerminated || isArchived ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{company.name}</p>
                              {company.name_en && <p className="text-xs text-muted-foreground truncate">{company.name_en}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm truncate">{company.email || "—"}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{company.activity_type || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">
                            {sub?.plan ? (isRTL ? sub.plan.name_ar : sub.plan.name_en) : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} text-xs`}>
                            {isRTL ? cfg.labelAr : cfg.labelEn}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {format(new Date(company.created_at), "dd MMM yyyy", { locale: isRTL ? ar : enUS })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-52">
                              <DropdownMenuItem onClick={() => setViewCompany(company)}>
                                <Eye className="h-4 w-4 me-2" />
                                {isRTL ? "عرض التفاصيل" : "View Details"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                disabled={isArchived}
                                onClick={() => navigate(`/owner/subscribers/${company.id}/access`)}
                              >
                                <ShieldCheck className="h-4 w-4 me-2 text-primary" />
                                {isRTL ? "إدارة الوصول والصلاحيات" : "Manage Access & Permissions"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {!isArchived && !isTerminated && status !== "suspended" && (
                                <DropdownMenuItem onClick={() => setConfirmAction({ type: "suspend", company })}>
                                  <Pause className="h-4 w-4 me-2 text-yellow-600" />
                                  {isRTL ? "تعليق الاشتراك" : "Suspend"}
                                </DropdownMenuItem>
                              )}
                              {!isArchived && !isTerminated && (
                                <DropdownMenuItem onClick={() => setConfirmAction({ type: "terminate", company })}>
                                  <Ban className="h-4 w-4 me-2 text-red-600" />
                                  {isRTL ? "إنهاء الاشتراك" : "Terminate"}
                                </DropdownMenuItem>
                              )}
                              {!isArchived && (
                                <DropdownMenuItem onClick={() => setConfirmAction({ type: "delete", company })} className="text-destructive">
                                  <Trash2 className="h-4 w-4 me-2" />
                                  {isRTL ? "حذف المشترك" : "Delete Subscriber"}
                                </DropdownMenuItem>
                              )}
                              {isArchived && (
                                <DropdownMenuItem onClick={() => { setRestoreCompany(company); setRestorePassword(""); }}>
                                  <RotateCcw className="h-4 w-4 me-2 text-green-600" />
                                  {isRTL ? "استعادة" : "Restore"}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="border-t p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink isActive={page === pageNum} onClick={() => setPage(pageNum)} className="cursor-pointer">{pageNum}</PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Company Sheet */}
      <Sheet open={!!viewCompany} onOpenChange={() => setViewCompany(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isRTL ? "تفاصيل الشركة" : "Company Details"}</SheetTitle>
          </SheetHeader>
          {viewCompany && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{viewCompany.name}</h3>
                  {viewCompany.name_en && <p className="text-sm text-muted-foreground">{viewCompany.name_en}</p>}
                </div>
              </div>
              <div className="space-y-3">
                {viewCompany.email && <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{viewCompany.email}</span></div>}
                {viewCompany.phone && <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{viewCompany.phone}</span></div>}
                {viewCompany.address && <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{viewCompany.address}</span></div>}
                <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{format(new Date(viewCompany.created_at), "dd MMM yyyy", { locale: isRTL ? ar : enUS })}</span></div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">{isRTL ? "معلومات إضافية" : "Additional Info"}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground">{isRTL ? "السجل التجاري" : "CR"}</p><p className="font-medium">{viewCompany.commercial_register || "—"}</p></div>
                  <div><p className="text-muted-foreground">{isRTL ? "الرقم الضريبي" : "Tax No."}</p><p className="font-medium">{viewCompany.tax_number || "—"}</p></div>
                  <div><p className="text-muted-foreground">{isRTL ? "نوع النشاط" : "Activity"}</p><p className="font-medium">{viewCompany.activity_type || "—"}</p></div>
                  <div><p className="text-muted-foreground">{isRTL ? "العملة" : "Currency"}</p><p className="font-medium">{viewCompany.currency || "SAR"}</p></div>
                </div>
              </div>
              {(() => {
                const sub = getActiveSubscription(viewCompany.subscriptions || []);
                if (!sub) return null;
                const cfg = statusConfig[sub.status] || statusConfig.none;
                return (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">{isRTL ? "الاشتراك" : "Subscription"}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={`${cfg.color} text-xs`}>{isRTL ? cfg.labelAr : cfg.labelEn}</Badge>
                      <span className="text-sm font-medium">{sub.plan ? (isRTL ? sub.plan.name_ar : sub.plan.name_en) : "—"}</span>
                    </div>
                    {sub.start_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sub.start_date), "dd MMM yyyy", { locale: isRTL ? ar : enUS })}
                        {sub.end_date && ` → ${format(new Date(sub.end_date), "dd MMM yyyy", { locale: isRTL ? ar : enUS })}`}
                      </p>
                    )}
                  </div>
                );
              })()}
              {/* Quick Access Button */}
              <Button
                className="w-full gap-2"
                onClick={() => { setViewCompany(null); navigate(`/owner/subscribers/${viewCompany.id}/access`); }}
              >
                <Settings2 className="h-4 w-4" />
                {isRTL ? "إدارة الوصول والصلاحيات" : "Manage Access & Permissions"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction && (isRTL ? confirmMessages[confirmAction.type].titleAr : confirmMessages[confirmAction.type].titleEn)}</DialogTitle>
            <DialogDescription>{confirmAction && (isRTL ? confirmMessages[confirmAction.type].descAr : confirmMessages[confirmAction.type].descEn)}</DialogDescription>
          </DialogHeader>
          {confirmAction && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{confirmAction.company.name}</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button
              variant={confirmAction?.type === "delete" || confirmAction?.type === "terminate" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? (isRTL ? "جاري التنفيذ..." : "Processing...") : (isRTL ? "تأكيد" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={!!restoreCompany} onOpenChange={() => { setRestoreCompany(null); setRestorePassword(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" />{isRTL ? "استعادة المشترك" : "Restore Subscriber"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "سيتم استعادة الشركة مع كلمة مرور جديدة وتجربة 14 يوم." : "Company will be restored with a new password and 14-day trial."}
            </DialogDescription>
          </DialogHeader>
          {restoreCompany && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-medium">{restoreCompany.name}</span>
                  {restoreCompany.email && <p className="text-xs text-muted-foreground">{restoreCompany.email}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" />{isRTL ? "كلمة المرور الجديدة" : "New Password"}</Label>
                <Input type="password" value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} placeholder="Pass@123" dir="ltr" />
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "حرف كبير + صغير + رقم + رمز (8 أحرف)" : "Upper + lower + number + symbol (8 chars)"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRestoreCompany(null); setRestorePassword(""); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button
              onClick={() => restoreMutation.mutate({ companyId: restoreCompany.id, newPassword: restorePassword })}
              disabled={restoreMutation.isPending || !isStrongPassword(restorePassword)}
            >
              {restoreMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "استعادة الحساب" : "Restore Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subscriber Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetNewSub(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />{isRTL ? "إضافة مشترك جديد" : "Add New Subscriber"}</DialogTitle>
            <DialogDescription>{isRTL ? "أدخل بيانات المشترك الجديد" : "Enter new subscriber details"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "البريد الإلكتروني *" : "Email *"}</Label>
                <Input type="email" dir="ltr" value={newSub.email} onChange={(e) => setNewSub({ ...newSub, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "كلمة المرور *" : "Password *"}</Label>
                <div className="relative">
                  <Input type={showNewPassword ? "text" : "password"} dir="ltr" value={newSub.password} onChange={(e) => setNewSub({ ...newSub, password: e.target.value })} placeholder="Pass@123" />
                  <Button type="button" variant="ghost" size="icon" className="absolute end-0 top-0 h-10 w-10" onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "اسم الشركة (عربي) *" : "Company Name (Arabic) *"}</Label><Input value={newSub.company_name} onChange={(e) => setNewSub({ ...newSub, company_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}</Label><Input dir="ltr" value={newSub.company_name_en} onChange={(e) => setNewSub({ ...newSub, company_name_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "اسم المسؤول" : "Contact Name"}</Label><Input value={newSub.full_name} onChange={(e) => setNewSub({ ...newSub, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "رقم الجوال" : "Phone"}</Label><Input dir="ltr" value={newSub.phone} onChange={(e) => setNewSub({ ...newSub, phone: e.target.value })} placeholder="05XXXXXXXX" /></div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الباقة *" : "Plan *"}</Label>
              <Select value={newSub.plan_id} onValueChange={(v) => setNewSub({ ...newSub, plan_id: v })}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الباقة" : "Select plan"} /></SelectTrigger>
                <SelectContent>
                  {(plans || []).map((plan: any) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {isRTL ? plan.name_ar : plan.name_en} — {plan.price} {isRTL ? "ر.س" : "SAR"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "نوع النشاط" : "Activity Type"}</Label><Input value={newSub.activity_type} onChange={(e) => setNewSub({ ...newSub, activity_type: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "الرقم الضريبي" : "Tax Number"}</Label><Input dir="ltr" value={newSub.tax_number} onChange={(e) => setNewSub({ ...newSub, tax_number: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "السجل التجاري" : "Commercial Register"}</Label><Input dir="ltr" value={newSub.commercial_register} onChange={(e) => setNewSub({ ...newSub, commercial_register: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isRTL ? "العنوان" : "Address"}</Label><Input value={newSub.address} onChange={(e) => setNewSub({ ...newSub, address: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetNewSub(); }}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button
              onClick={() => createSubscriberMutation.mutate()}
              disabled={createSubscriberMutation.isPending || !newSub.email || !newSub.company_name || !newSub.plan_id || !isStrongPassword(newSub.password)}
            >
              {createSubscriberMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "إنشاء المشترك" : "Create Subscriber"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerSubscribers;
