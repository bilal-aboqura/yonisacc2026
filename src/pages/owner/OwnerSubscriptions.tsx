import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Eye, CheckCircle, XCircle, Clock, Loader2, MoreVertical,
  PlayCircle, PauseCircle, Ban, CalendarPlus, ArrowRightLeft, Zap,
  Building2, TrendingUp, AlertTriangle, DollarSign,
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { ar, enUS } from "date-fns/locale";

type ActionType = "activate" | "suspend" | "cancel" | "extend" | "change_plan" | "convert_trial" | null;

const OwnerSubscriptions = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

  // Fetch subscriptions with company and plan data
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["owner-billing-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          company:companies(id, name, name_en, email, phone, owner_id, deleted_at),
          plan:subscription_plans(id, name_ar, name_en, price, duration_months)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data?.filter((s: any) => !s.company?.deleted_at) || [];
    },
  });

  // Fetch plans for change plan action
  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Mutation for all subscription actions
  const actionMutation = useMutation({
    mutationFn: async ({ sub, type }: { sub: any; type: ActionType }) => {
      const updateData: any = { notes: actionNotes || sub.notes };

      switch (type) {
        case "activate": {
          updateData.status = "active";
          updateData.payment_reference = paymentRef;
          updateData.payment_date = new Date().toISOString();
          if (!sub.start_date) {
            updateData.start_date = new Date().toISOString().split("T")[0];
          }
          if (!sub.end_date && sub.plan?.duration_months) {
            const end = new Date();
            end.setMonth(end.getMonth() + sub.plan.duration_months);
            updateData.end_date = end.toISOString().split("T")[0];
          }
          break;
        }
        case "suspend":
          updateData.status = "suspended";
          break;
        case "cancel":
          updateData.status = "cancelled";
          break;
        case "extend": {
          const currentEnd = sub.end_date ? new Date(sub.end_date) : new Date();
          currentEnd.setDate(currentEnd.getDate() + parseInt(extendDays));
          updateData.end_date = currentEnd.toISOString().split("T")[0];
          break;
        }
        case "change_plan":
          updateData.plan_id = selectedPlanId;
          break;
        case "convert_trial": {
          updateData.status = "active";
          updateData.payment_reference = paymentRef;
          updateData.payment_date = new Date().toISOString();
          const end = new Date();
          end.setMonth(end.getMonth() + (sub.plan?.duration_months || 1));
          updateData.end_date = end.toISOString().split("T")[0];
          break;
        }
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", sub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-billing-subscriptions"] });
      closeDialogs();
      toast({
        title: isRTL ? "تم التحديث" : "Updated",
        description: isRTL ? "تم تحديث الاشتراك بنجاح" : "Subscription updated successfully",
      });
    },
    onError: () => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ أثناء التحديث" : "Error updating subscription",
        variant: "destructive",
      });
    },
  });

  const closeDialogs = () => {
    setIsConfirmOpen(false);
    setActionType(null);
    setActionNotes("");
    setPaymentRef("");
    setExtendDays("30");
    setSelectedPlanId("");
  };

  const openAction = (sub: any, type: ActionType) => {
    setSelectedSubscription(sub);
    setActionType(type);
    setIsConfirmOpen(true);
  };

  // Status badges
  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: React.ReactNode; label: string; labelAr: string }> = {
      active: { className: "bg-green-500/10 text-green-600 border-green-200", icon: <CheckCircle className="h-3 w-3 me-1" />, label: "Active", labelAr: "نشط" },
      trialing: { className: "bg-blue-500/10 text-blue-600 border-blue-200", icon: <Zap className="h-3 w-3 me-1" />, label: "Trial", labelAr: "تجريبي" },
      pending: { className: "bg-amber-500/10 text-amber-600 border-amber-200", icon: <Clock className="h-3 w-3 me-1" />, label: "Pending", labelAr: "معلق" },
      expired: { className: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="h-3 w-3 me-1" />, label: "Expired", labelAr: "منتهي" },
      suspended: { className: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: <PauseCircle className="h-3 w-3 me-1" />, label: "Suspended", labelAr: "موقوف" },
      cancelled: { className: "bg-muted text-muted-foreground border-muted", icon: <Ban className="h-3 w-3 me-1" />, label: "Cancelled", labelAr: "ملغي" },
      past_due: { className: "bg-orange-500/10 text-orange-600 border-orange-200", icon: <AlertTriangle className="h-3 w-3 me-1" />, label: "Past Due", labelAr: "متأخر" },
      terminated: { className: "bg-red-500/10 text-red-700 border-red-300", icon: <Ban className="h-3 w-3 me-1" />, label: "Terminated", labelAr: "منتهي" },
    };
    const c = config[status] || { className: "bg-muted text-muted-foreground border-muted", icon: null, label: status, labelAr: status };
    return <Badge className={c.className}>{c.icon}{isRTL ? c.labelAr : c.label}</Badge>;
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return { days, label: isRTL ? `منتهي منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)}d ago`, color: "text-destructive" };
    if (days <= 7) return { days, label: isRTL ? `${days} يوم متبقي` : `${days}d left`, color: "text-destructive" };
    if (days <= 30) return { days, label: isRTL ? `${days} يوم متبقي` : `${days}d left`, color: "text-amber-600" };
    return { days, label: isRTL ? `${days} يوم متبقي` : `${days}d left`, color: "text-muted-foreground" };
  };

  // Summary stats
  const stats = {
    active: subscriptions?.filter((s: any) => s.status === "active").length || 0,
    trialing: subscriptions?.filter((s: any) => s.status === "trialing").length || 0,
    expired: subscriptions?.filter((s: any) => ["expired", "suspended", "cancelled"].includes(s.status)).length || 0,
    mrr: subscriptions?.filter((s: any) => s.status === "active").reduce((sum: number, s: any) => sum + (s.plan?.price || 0), 0) || 0,
  };

  const filteredSubscriptions = subscriptions?.filter((sub: any) => {
    const matchesSearch =
      sub.company?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sub.company?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const actionLabels: Record<string, { en: string; ar: string }> = {
    activate: { en: "Activate Subscription", ar: "تفعيل الاشتراك" },
    suspend: { en: "Suspend Subscription", ar: "إيقاف الاشتراك" },
    cancel: { en: "Cancel Subscription", ar: "إلغاء الاشتراك" },
    extend: { en: "Extend End Date", ar: "تمديد تاريخ الانتهاء" },
    change_plan: { en: "Change Plan", ar: "تغيير الباقة" },
    convert_trial: { en: "Convert Trial to Paid", ar: "تحويل التجريبي لمدفوع" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{isRTL ? "إدارة الفوترة" : "Billing Management"}</h1>
        <p className="text-muted-foreground mt-1">{isRTL ? "إدارة اشتراكات ودورة حياة الفواتير" : "Manage subscription lifecycle and billing"}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: isRTL ? "نشط" : "Active", value: stats.active, color: "text-green-600", bg: "bg-green-500/10" },
          { icon: Zap, label: isRTL ? "تجريبي" : "Trial", value: stats.trialing, color: "text-blue-600", bg: "bg-blue-500/10" },
          { icon: AlertTriangle, label: isRTL ? "غير نشط" : "Inactive", value: stats.expired, color: "text-destructive", bg: "bg-destructive/10" },
          { icon: DollarSign, label: isRTL ? "الإيراد الشهري" : "MRR", value: `${stats.mrr.toLocaleString()} SAR`, color: "text-primary", bg: "bg-primary/10" },
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isRTL ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
                <SelectItem value="trialing">{isRTL ? "تجريبي" : "Trial"}</SelectItem>
                <SelectItem value="active">{isRTL ? "نشط" : "Active"}</SelectItem>
                <SelectItem value="pending">{isRTL ? "معلق" : "Pending"}</SelectItem>
                <SelectItem value="expired">{isRTL ? "منتهي" : "Expired"}</SelectItem>
                <SelectItem value="suspended">{isRTL ? "موقوف" : "Suspended"}</SelectItem>
                <SelectItem value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الشركة" : "Company"}</TableHead>
                <TableHead>{isRTL ? "البريد" : "Email"}</TableHead>
                <TableHead>{isRTL ? "الباقة" : "Plan"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "المتبقي" : "Remaining"}</TableHead>
                <TableHead>{isRTL ? "تاريخ الانتهاء" : "End Date"}</TableHead>
                <TableHead className="w-[60px]">{isRTL ? "إجراء" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredSubscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد اشتراكات" : "No subscriptions found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions?.map((sub: any) => {
                  const remaining = getDaysRemaining(sub.end_date);
                  const isTerminated = sub.status === "terminated";
                  return (
                    <TableRow key={sub.id} className={isTerminated ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        {isRTL ? sub.company?.name : sub.company?.name_en || sub.company?.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{sub.company?.email || "-"}</TableCell>
                      <TableCell>{isRTL ? sub.plan?.name_ar : sub.plan?.name_en}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        {remaining ? (
                          <span className={`text-sm font-medium ${remaining.color}`}>{remaining.label}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {sub.end_date
                          ? format(new Date(sub.end_date), "dd MMM yyyy", { locale: isRTL ? ar : enUS })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isTerminated}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? "start" : "end"}>
                            <DropdownMenuItem onClick={() => { setSelectedSubscription(sub); setIsDetailOpen(true); }}>
                              <Eye className="h-4 w-4 me-2" />
                              {isRTL ? "عرض التفاصيل" : "View Details"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {["pending", "suspended", "expired", "cancelled"].includes(sub.status) && (
                              <DropdownMenuItem onClick={() => openAction(sub, "activate")}>
                                <PlayCircle className="h-4 w-4 me-2 text-green-600" />
                                {isRTL ? "تفعيل" : "Activate"}
                              </DropdownMenuItem>
                            )}
                            {sub.status === "trialing" && (
                              <DropdownMenuItem onClick={() => openAction(sub, "convert_trial")}>
                                <TrendingUp className="h-4 w-4 me-2 text-primary" />
                                {isRTL ? "تحويل لمدفوع" : "Convert to Paid"}
                              </DropdownMenuItem>
                            )}
                            {["active", "trialing"].includes(sub.status) && (
                              <DropdownMenuItem onClick={() => openAction(sub, "suspend")}>
                                <PauseCircle className="h-4 w-4 me-2 text-yellow-600" />
                                {isRTL ? "إيقاف" : "Suspend"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openAction(sub, "extend")}>
                              <CalendarPlus className="h-4 w-4 me-2 text-blue-600" />
                              {isRTL ? "تمديد" : "Extend"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAction(sub, "change_plan")}>
                              <ArrowRightLeft className="h-4 w-4 me-2" />
                              {isRTL ? "تغيير الباقة" : "Change Plan"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sub.status !== "cancelled" && (
                              <DropdownMenuItem className="text-destructive" onClick={() => openAction(sub, "cancel")}>
                                <Ban className="h-4 w-4 me-2" />
                                {isRTL ? "إلغاء" : "Cancel"}
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
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل الاشتراك" : "Subscription Details"}</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الشركة" : "Company"}</p>
                  <p className="font-medium">{selectedSubscription.company?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الباقة" : "Plan"}</p>
                  <p className="font-medium">{isRTL ? selectedSubscription.plan?.name_ar : selectedSubscription.plan?.name_en}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "السعر" : "Price"}</p>
                  <p className="font-medium">{selectedSubscription.plan?.price} SAR</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الحالة" : "Status"}</p>
                  {getStatusBadge(selectedSubscription.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "تاريخ البداية" : "Start Date"}</p>
                  <p className="font-medium">{selectedSubscription.start_date ? format(new Date(selectedSubscription.start_date), "dd MMM yyyy", { locale: isRTL ? ar : enUS }) : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "تاريخ الانتهاء" : "End Date"}</p>
                  <p className="font-medium">{selectedSubscription.end_date ? format(new Date(selectedSubscription.end_date), "dd MMM yyyy", { locale: isRTL ? ar : enUS }) : "-"}</p>
                </div>
                {selectedSubscription.payment_reference && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">{isRTL ? "مرجع الدفع" : "Payment Ref"}</p>
                    <p className="font-medium">{selectedSubscription.payment_reference}</p>
                  </div>
                )}
                {selectedSubscription.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">{isRTL ? "ملاحظات" : "Notes"}</p>
                    <p className="font-medium">{selectedSubscription.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={(open) => { if (!open) closeDialogs(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType ? (isRTL ? actionLabels[actionType]?.ar : actionLabels[actionType]?.en) : ""}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? `الشركة: ${selectedSubscription?.company?.name}` : `Company: ${selectedSubscription?.company?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Activate / Convert trial fields */}
            {(actionType === "activate" || actionType === "convert_trial") && (
              <div className="space-y-2">
                <Label>{isRTL ? "مرجع الدفع" : "Payment Reference"}</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder={isRTL ? "رقم التحويل" : "Transfer number"} />
              </div>
            )}

            {/* Extend field */}
            {actionType === "extend" && (
              <div className="space-y-2">
                <Label>{isRTL ? "عدد الأيام" : "Number of Days"}</Label>
                <Select value={extendDays} onValueChange={setExtendDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 {isRTL ? "أيام" : "days"}</SelectItem>
                    <SelectItem value="14">14 {isRTL ? "يوم" : "days"}</SelectItem>
                    <SelectItem value="30">30 {isRTL ? "يوم" : "days"}</SelectItem>
                    <SelectItem value="60">60 {isRTL ? "يوم" : "days"}</SelectItem>
                    <SelectItem value="90">90 {isRTL ? "يوم" : "days"}</SelectItem>
                    <SelectItem value="365">365 {isRTL ? "يوم" : "days"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Change plan field */}
            {actionType === "change_plan" && (
              <div className="space-y-2">
                <Label>{isRTL ? "الباقة الجديدة" : "New Plan"}</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? "اختر باقة" : "Select plan"} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {isRTL ? p.name_ar : p.name_en} - {p.price} SAR
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes for all actions */}
            <div className="space-y-2">
              <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows={2} />
            </div>

            {/* Warning for destructive actions */}
            {(actionType === "suspend" || actionType === "cancel") && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {actionType === "suspend"
                    ? (isRTL ? "سيتم إيقاف وصول الشركة للنظام فوراً" : "Company access will be blocked immediately")
                    : (isRTL ? "سيتم إلغاء الاشتراك وحظر الوصول" : "Subscription will be cancelled and access blocked")}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialogs}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button
              className={actionType === "suspend" || actionType === "cancel" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "gradient-primary text-primary-foreground"}
              onClick={() => actionMutation.mutate({ sub: selectedSubscription, type: actionType })}
              disabled={actionMutation.isPending || (actionType === "change_plan" && !selectedPlanId)}
            >
              {actionMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isRTL ? "تأكيد" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerSubscriptions;
