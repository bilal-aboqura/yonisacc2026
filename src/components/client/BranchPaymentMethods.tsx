import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Banknote, Landmark, Receipt, Store } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  companyId: string;
}

const iconMap: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  bank_transfer: <Landmark className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  cheque: <Receipt className="h-4 w-4" />,
};

const BranchPaymentMethods = ({ companyId }: Props) => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ["branches-for-payment", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, name_en, is_main")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("is_main", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: methods, isLoading: loadingMethods } = useQuery({
    queryKey: ["payment-methods", companyId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("payment_methods")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const { data: branchMethods, isLoading: loadingLinks } = useQuery({
    queryKey: ["branch-payment-methods", companyId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("branch_payment_methods")
        .select("*")
        .eq("company_id", companyId);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ branchId, methodId, enabled }: { branchId: string; methodId: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await (supabase.from as any)("branch_payment_methods")
          .upsert({
            branch_id: branchId,
            payment_method_id: methodId,
            company_id: companyId,
            is_active: true,
          }, { onConflict: "branch_id,payment_method_id" });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("branch_payment_methods")
          .delete()
          .eq("branch_id", branchId)
          .eq("payment_method_id", methodId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-payment-methods", companyId] });
      toast.success(isRTL ? "تم التحديث" : "Updated");
    },
    onError: () => toast.error(isRTL ? "خطأ في التحديث" : "Error updating"),
  });

  const isLinked = (branchId: string, methodId: string) => {
    return branchMethods?.some((bm: any) => bm.branch_id === branchId && bm.payment_method_id === methodId && bm.is_active);
  };

  if (loadingBranches || loadingMethods || loadingLinks) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!methods?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{isRTL ? "لا توجد طرق دفع فعالة" : "No active payment methods"}</p>
          <p className="text-sm mt-1">{isRTL ? "أضف طرق دفع من إعدادات طرق الدفع أولاً" : "Add payment methods from Payment Methods settings first"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          {isRTL ? "ربط طرق الدفع بالفروع" : "Branch Payment Methods"}
        </CardTitle>
        <CardDescription>
          {isRTL ? "تحديد طرق الدفع المتاحة لكل فرع في نقاط البيع" : "Assign available payment methods per branch for POS"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">{isRTL ? "طريقة الدفع" : "Payment Method"}</TableHead>
                {branches?.map((b: any) => (
                  <TableHead key={b.id} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold">{isRTL ? b.name : b.name_en || b.name}</span>
                      {b.is_main && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{isRTL ? "رئيسي" : "Main"}</Badge>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods?.map((m: any, idx: number) => (
                <TableRow key={m.id} className={idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/10" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {iconMap[m.code] || <CreditCard className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium text-sm">{isRTL ? m.name : m.name_en || m.name}</span>
                    </div>
                  </TableCell>
                  {branches?.map((b: any) => (
                    <TableCell key={b.id} className="text-center">
                      <Switch
                        checked={isLinked(b.id, m.id)}
                        onCheckedChange={(v) => toggleMutation.mutate({ branchId: b.id, methodId: m.id, enabled: v })}
                        className="data-[state=checked]:bg-primary mx-auto"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BranchPaymentMethods;
