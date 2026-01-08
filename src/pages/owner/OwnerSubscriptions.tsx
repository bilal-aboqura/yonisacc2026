import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Eye, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const OwnerSubscriptions = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activationData, setActivationData] = useState({
    payment_reference: "",
    notes: "",
  });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["owner-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          company:companies(id, name, name_en, email, phone, owner_id),
          plan:subscription_plans(id, name_ar, name_en, price)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = {
        status,
        payment_reference: activationData.payment_reference,
        notes: activationData.notes,
      };

      if (status === "active") {
        updateData.payment_date = new Date().toISOString();
        updateData.start_date = new Date().toISOString().split("T")[0];
        
        // Calculate end date based on plan duration
        const subscription = subscriptions?.find((s) => s.id === id);
        if (subscription?.plan) {
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + (subscription.plan as any).duration_months || 1);
          updateData.end_date = endDate.toISOString().split("T")[0];
        }
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-subscriptions"] });
      setIsDialogOpen(false);
      setSelectedSubscription(null);
      setActivationData({ payment_reference: "", notes: "" });
      toast({
        title: isRTL ? "تم التحديث" : "Updated",
        description: isRTL ? "تم تحديث حالة الاشتراك" : "Subscription status updated",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-200">
            <CheckCircle className="h-3 w-3 me-1" />
            {isRTL ? "نشط" : "Active"}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
            <Clock className="h-3 w-3 me-1" />
            {isRTL ? "معلق" : "Pending"}
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="h-3 w-3 me-1" />
            {isRTL ? "منتهي" : "Expired"}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            {isRTL ? "ملغي" : "Cancelled"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch =
      sub.company?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sub.company?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isRTL ? "إدارة الاشتراكات" : "Subscriptions Management"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "عرض وإدارة اشتراكات العملاء" : "View and manage customer subscriptions"}
        </p>
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
                <SelectItem value="pending">{isRTL ? "معلق" : "Pending"}</SelectItem>
                <SelectItem value="active">{isRTL ? "نشط" : "Active"}</SelectItem>
                <SelectItem value="expired">{isRTL ? "منتهي" : "Expired"}</SelectItem>
                <SelectItem value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الشركة" : "Company"}</TableHead>
                <TableHead>{isRTL ? "الباقة" : "Plan"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "تاريخ البداية" : "Start Date"}</TableHead>
                <TableHead>{isRTL ? "تاريخ الانتهاء" : "End Date"}</TableHead>
                <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSubscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد اشتراكات" : "No subscriptions found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {isRTL ? sub.company?.name : sub.company?.name_en || sub.company?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{sub.company?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {isRTL ? sub.plan?.name_ar : sub.plan?.name_en}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      {sub.start_date
                        ? format(new Date(sub.start_date), "dd MMM yyyy", {
                            locale: isRTL ? ar : enUS,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {sub.end_date
                        ? format(new Date(sub.end_date), "dd MMM yyyy", {
                            locale: isRTL ? ar : enUS,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSubscription(sub);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 me-1" />
                        {isRTL ? "عرض" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "تفاصيل الاشتراك" : "Subscription Details"}
            </DialogTitle>
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
                  <p className="font-medium">
                    {isRTL ? selectedSubscription.plan?.name_ar : selectedSubscription.plan?.name_en}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "السعر" : "Price"}</p>
                  <p className="font-medium">{selectedSubscription.plan?.price} SAR</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isRTL ? "الحالة" : "Status"}</p>
                  {getStatusBadge(selectedSubscription.status)}
                </div>
              </div>

              {selectedSubscription.status === "pending" && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">
                    {isRTL ? "تفعيل الاشتراك" : "Activate Subscription"}
                  </h4>
                  <div className="space-y-2">
                    <Label>{isRTL ? "مرجع الدفع" : "Payment Reference"}</Label>
                    <Input
                      value={activationData.payment_reference}
                      onChange={(e) =>
                        setActivationData({ ...activationData, payment_reference: e.target.value })
                      }
                      placeholder={isRTL ? "رقم التحويل البنكي" : "Bank transfer number"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
                    <Textarea
                      value={activationData.notes}
                      onChange={(e) =>
                        setActivationData({ ...activationData, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {selectedSubscription.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        activateMutation.mutate({
                          id: selectedSubscription.id,
                          status: "cancelled",
                        })
                      }
                      disabled={activateMutation.isPending}
                    >
                      {isRTL ? "رفض" : "Reject"}
                    </Button>
                    <Button
                      className="gradient-primary text-white"
                      onClick={() =>
                        activateMutation.mutate({
                          id: selectedSubscription.id,
                          status: "active",
                        })
                      }
                      disabled={activateMutation.isPending}
                    >
                      {activateMutation.isPending && (
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      )}
                      {isRTL ? "تفعيل" : "Activate"}
                    </Button>
                  </>
                )}
                {selectedSubscription.status === "active" && (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      activateMutation.mutate({
                        id: selectedSubscription.id,
                        status: "cancelled",
                      })
                    }
                    disabled={activateMutation.isPending}
                  >
                    {isRTL ? "إلغاء الاشتراك" : "Cancel Subscription"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerSubscriptions;
