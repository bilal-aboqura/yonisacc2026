import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import useTenantIsolation from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Link2, Plus, Copy, Trash2, Eye, Check, X, RefreshCw, Wifi, WifiOff,
  ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle, Loader2
} from "lucide-react";
import { format } from "date-fns";

const PROVIDERS = [
  { value: "foodics", label: "فودكس", labelEn: "Foodics", color: "bg-orange-500" },
  { value: "hungerstation", label: "هنقرستيشن", labelEn: "HungerStation", color: "bg-red-500" },
  { value: "jahez", label: "جاهز", labelEn: "Jahez", color: "bg-purple-500" },
  { value: "marsool", label: "مرسول", labelEn: "Marsool", color: "bg-yellow-500" },
  { value: "talabat", label: "طلبات", labelEn: "Talabat", color: "bg-orange-600" },
  { value: "custom", label: "مخصص", labelEn: "Custom", color: "bg-muted-foreground" },
];

const STATUS_MAP: Record<string, { label: string; labelEn: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد الانتظار", labelEn: "Pending", icon: Clock, variant: "outline" },
  accepted: { label: "مقبول", labelEn: "Accepted", icon: CheckCircle2, variant: "default" },
  preparing: { label: "قيد التحضير", labelEn: "Preparing", icon: Loader2, variant: "secondary" },
  ready: { label: "جاهز", labelEn: "Ready", icon: Check, variant: "default" },
  completed: { label: "مكتمل", labelEn: "Completed", icon: CheckCircle2, variant: "default" },
  rejected: { label: "مرفوض", labelEn: "Rejected", icon: XCircle, variant: "destructive" },
  cancelled: { label: "ملغي", labelEn: "Cancelled", icon: AlertCircle, variant: "destructive" },
};

const POSIntegrations = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newProvider, setNewProvider] = useState("");
  const [newProviderName, setNewProviderName] = useState("");
  const [newBranchId, setNewBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFoodicsDialog, setShowFoodicsDialog] = useState(false);
  const [foodicsIntegrationId, setFoodicsIntegrationId] = useState("");
  const [foodicsToken, setFoodicsToken] = useState("");
  const [foodicsBusinessId, setFoodicsBusinessId] = useState("");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookBaseUrl = `https://${projectId}.supabase.co/functions/v1/pos-api-webhook`;

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, name_en")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch integrations
  const { data: integrations = [], isLoading: loadingIntegrations } = useQuery({
    queryKey: ["pos-integrations", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("pos_api_integrations")
        .select("*, branches(name, name_en)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["pos-api-orders", companyId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("pos_api_orders")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch logs
  const { data: logs = [] } = useQuery({
    queryKey: ["pos-api-logs", companyId],
    queryFn: async () => {
      const integrationIds = integrations.map((i: any) => i.id);
      if (integrationIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from("pos_api_logs")
        .select("*")
        .in("integration_id", integrationIds)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!companyId && integrations.length > 0,
  });

  // Add integration
  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("pos_api_integrations").insert({
        company_id: companyId!,
        branch_id: newBranchId,
        provider: newProvider,
        provider_name: newProviderName || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-integrations"] });
      setShowAddDialog(false);
      setNewProvider("");
      setNewProviderName("");
      setNewBranchId("");
      toast.success(isRTL ? "تم إضافة التكامل بنجاح" : "Integration added successfully");
    },
    onError: () => toast.error(isRTL ? "فشل إضافة التكامل" : "Failed to add integration"),
  });

  // Toggle integration
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("pos_api_integrations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos-integrations"] }),
  });

  // Delete integration
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_api_integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-integrations"] });
      toast.success(isRTL ? "تم حذف التكامل" : "Integration deleted");
    },
  });

  // Update auto accept
  const autoAcceptMutation = useMutation({
    mutationFn: async ({ id, auto_accept_orders }: { id: string; auto_accept_orders: boolean }) => {
      const { error } = await supabase
        .from("pos_api_integrations")
        .update({ auto_accept_orders })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos-integrations"] }),
  });

  // Accept/Reject order
  const orderActionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "accepted") updateData.accepted_at = new Date().toISOString();
      if (status === "completed") updateData.completed_at = new Date().toISOString();
      const { error } = await supabase.from("pos_api_orders").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-api-orders"] });
      toast.success(isRTL ? "تم تحديث حالة الطلب" : "Order status updated");
    },
  });

  // Save Foodics settings
  const saveFoodicsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pos_api_integrations")
        .update({
          settings: {
            foodics_api_token: foodicsToken,
            foodics_business_id: foodicsBusinessId,
          },
        })
        .eq("id", foodicsIntegrationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-integrations"] });
      setShowFoodicsDialog(false);
      toast.success(isRTL ? "تم حفظ إعدادات فودكس" : "Foodics settings saved");
    },
  });

  // Sync Foodics orders
  const syncFoodicsMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.functions.invoke("pos-foodics-sync", {
        body: { integration_id: integrationId, action: "pull_orders" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pos-api-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pos-api-logs"] });
      toast.success(
        isRTL
          ? `تم استيراد ${data.imported} طلب من ${data.total_fetched}`
          : `Imported ${data.imported} of ${data.total_fetched} orders`
      );
    },
    onError: () => toast.error(isRTL ? "فشل المزامنة مع فودكس" : "Foodics sync failed"),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isRTL ? "تم النسخ" : "Copied!");
  };

  const getProviderInfo = (provider: string) =>
    PROVIDERS.find((p) => p.value === provider) || PROVIDERS[PROVIDERS.length - 1];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isRTL ? "ربط التطبيقات" : "App Integrations"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL
              ? "إدارة ربط تطبيقات التوصيل الخارجية مع نقاط البيع"
              : "Manage external delivery app integrations with POS"}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة تكامل" : "Add Integration"}
        </Button>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">
            <Link2 className="h-4 w-4 me-2" />
            {isRTL ? "التكاملات" : "Integrations"}
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ExternalLink className="h-4 w-4 me-2" />
            {isRTL ? "الطلبات الواردة" : "Incoming Orders"}
            {orders.filter((o: any) => o.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ms-2 h-5 min-w-5 text-xs">
                {orders.filter((o: any) => o.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="h-4 w-4 me-2" />
            {isRTL ? "السجل" : "Logs"}
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          {loadingIntegrations ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isRTL ? "لا توجد تكاملات حالياً" : "No integrations yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration: any) => {
                const provider = getProviderInfo(integration.provider);
                return (
                  <Card key={integration.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white font-bold text-sm`}>
                            {(isRTL ? provider.label : provider.labelEn).charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {integration.provider_name || (isRTL ? provider.label : provider.labelEn)}
                              </h3>
                              {integration.is_active ? (
                                <Badge variant="default" className="gap-1">
                                  <Wifi className="h-3 w-3" />
                                  {isRTL ? "مفعل" : "Active"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <WifiOff className="h-3 w-3" />
                                  {isRTL ? "معطل" : "Inactive"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {isRTL ? "الفرع: " : "Branch: "}
                              {isRTL ? integration.branches?.name : integration.branches?.name_en || integration.branches?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: integration.id, is_active: checked })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(integration.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {/* API Key */}
                        <div className="flex items-center gap-2">
                          <Label className="text-sm min-w-24">{isRTL ? "مفتاح API:" : "API Key:"}</Label>
                          <code className="flex-1 bg-muted px-3 py-1.5 rounded text-xs font-mono truncate">
                            {integration.api_key}
                          </code>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(integration.api_key)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Webhook URL */}
                        <div className="flex items-center gap-2">
                          <Label className="text-sm min-w-24">{isRTL ? "رابط Webhook:" : "Webhook URL:"}</Label>
                          <code className="flex-1 bg-muted px-3 py-1.5 rounded text-xs font-mono truncate">
                            {webhookBaseUrl}
                          </code>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(webhookBaseUrl)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Auto accept */}
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={integration.auto_accept_orders}
                            onCheckedChange={(checked) =>
                              autoAcceptMutation.mutate({ id: integration.id, auto_accept_orders: checked })
                            }
                          />
                          <Label className="text-sm">
                            {isRTL ? "قبول الطلبات تلقائياً" : "Auto-accept orders"}
                          </Label>
                        </div>

                        {/* Foodics specific */}
                        {integration.provider === "foodics" && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFoodicsIntegrationId(integration.id);
                                const s = integration.settings || {};
                                setFoodicsToken(s.foodics_api_token || "");
                                setFoodicsBusinessId(s.foodics_business_id || "");
                                setShowFoodicsDialog(true);
                              }}
                            >
                              <Settings2Icon className="h-4 w-4 me-1" />
                              {isRTL ? "إعدادات فودكس" : "Foodics Settings"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncFoodicsMutation.mutate(integration.id)}
                              disabled={syncFoodicsMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 me-1 ${syncFoodicsMutation.isPending ? "animate-spin" : ""}`} />
                              {isRTL ? "مزامنة الطلبات" : "Sync Orders"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Statuses"}</SelectItem>
                {Object.entries(STATUS_MAP).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {isRTL ? val.label : val.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingOrders ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الرقم الخارجي" : "External ID"}</TableHead>
                    <TableHead>{isRTL ? "المزود" : "Provider"}</TableHead>
                    <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                    <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {isRTL ? "لا توجد طلبات" : "No orders"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order: any) => {
                      const provider = getProviderInfo(order.provider);
                      const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.external_order_id || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {isRTL ? provider.label : provider.labelEn}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.customer_name || "-"}</TableCell>
                          <TableCell className="font-semibold">{Number(order.total).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {isRTL ? status.label : status.labelEn}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {order.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => orderActionMutation.mutate({ id: order.id, status: "accepted" })}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => orderActionMutation.mutate({ id: order.id, status: "rejected" })}
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الحدث" : "Event"}</TableHead>
                  <TableHead>{isRTL ? "التفاصيل" : "Details"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      {isRTL ? "لا توجد سجلات" : "No logs"}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{log.event}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                        {JSON.stringify(log.payload || {}).substring(0, 120)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Integration Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "إضافة تكامل جديد" : "Add New Integration"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isRTL ? "المزود" : "Provider"}</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر المزود" : "Select provider"} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {isRTL ? p.label : p.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newProvider === "custom" && (
              <div>
                <Label>{isRTL ? "اسم التطبيق" : "App Name"}</Label>
                <Input
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                  placeholder={isRTL ? "اسم التطبيق المخصص" : "Custom app name"}
                />
              </div>
            )}
            <div>
              <Label>{isRTL ? "الفرع" : "Branch"}</Label>
              <Select value={newBranchId} onValueChange={setNewBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر الفرع" : "Select branch"} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {isRTL ? b.name : b.name_en || b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newProvider || !newBranchId || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isRTL ? "إضافة" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Foodics Settings Dialog */}
      <Dialog open={showFoodicsDialog} onOpenChange={setShowFoodicsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "إعدادات فودكس" : "Foodics Settings"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isRTL ? "رمز API (Token)" : "API Token"}</Label>
              <Input
                type="password"
                value={foodicsToken}
                onChange={(e) => setFoodicsToken(e.target.value)}
                placeholder="Enter Foodics API Token"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL
                  ? "يمكنك الحصول عليه من لوحة تحكم فودكس → الإعدادات → API"
                  : "Get it from Foodics Dashboard → Settings → API"}
              </p>
            </div>
            <div>
              <Label>{isRTL ? "معرف المتجر (Business ID)" : "Business ID"}</Label>
              <Input
                value={foodicsBusinessId}
                onChange={(e) => setFoodicsBusinessId(e.target.value)}
                placeholder={isRTL ? "اختياري" : "Optional"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFoodicsDialog(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => saveFoodicsMutation.mutate()}
              disabled={!foodicsToken || saveFoodicsMutation.isPending}
            >
              {saveFoodicsMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "تفاصيل الطلب" : "Order Details"}
              {selectedOrder?.external_order_id && ` #${selectedOrder.external_order_id}`}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{isRTL ? "العميل" : "Customer"}</Label>
                    <p className="font-medium">{selectedOrder.customer_name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{isRTL ? "الهاتف" : "Phone"}</Label>
                    <p className="font-medium">{selectedOrder.customer_phone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{isRTL ? "العنوان" : "Address"}</Label>
                    <p className="font-medium">{selectedOrder.customer_address || "-"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block">{isRTL ? "الأصناف" : "Items"}</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
                        <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
                        <TableHead>{isRTL ? "السعر" : "Price"}</TableHead>
                        <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map(
                        (item: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{item.name || "-"}</TableCell>
                            <TableCell>{item.quantity || 1}</TableCell>
                            <TableCell>{Number(item.unit_price || 0).toFixed(2)}</TableCell>
                            <TableCell>{Number(item.total || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? "المجموع الفرعي" : "Subtotal"}</span>
                    <span>{Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? "الضريبة" : "Tax"}</span>
                    <span>{Number(selectedOrder.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? "التوصيل" : "Delivery"}</span>
                    <span>{Number(selectedOrder.delivery_fee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? "الخصم" : "Discount"}</span>
                    <span>-{Number(selectedOrder.discount_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>{isRTL ? "الإجمالي" : "Total"}</span>
                    <span>{Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <Label className="text-muted-foreground">{isRTL ? "ملاحظات" : "Notes"}</Label>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Inline icon component for Settings2 (not in lucide-react@0.462)
const Settings2Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>
  </svg>
);

export default POSIntegrations;
