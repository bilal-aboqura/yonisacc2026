import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";

const CreateFuelCustomer = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", mobile: "", customer_type: "individual",
    plate_number: "", credit_limit: "0", notes: "",
  });

  const { data: existing } = useQuery({
    queryKey: ["fuel-customer", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_customers").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "", name_en: existing.name_en || "",
        mobile: existing.mobile || "", customer_type: existing.customer_type || "individual",
        plate_number: existing.plate_number || "", credit_limit: String(existing.credit_limit || 0),
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, credit_limit: parseFloat(form.credit_limit) || 0, company_id: companyId };
      if (isEdit) {
        const { error } = await (supabase as any).from("fuel_customers").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: customer, error } = await (supabase as any).from("fuel_customers").insert(payload).select("id").single();
        if (error) throw error;
        // Create wallet for new customer
        await (supabase as any).from("fuel_wallets").insert({ customer_id: customer.id, company_id: companyId, balance: 0 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-customers"] });
      toast({ title: isRTL ? "تم الحفظ" : "Saved" });
      navigate("/client/fuel/customers");
    },
    onError: (e: any) => toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" }),
  });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/fuel/customers")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل عميل الوقود" : "Edit Fuel Customer") : (isRTL ? "إضافة عميل وقود" : "Add Fuel Customer")}</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم *" : "Name *"}</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم بالإنجليزية" : "English Name"}</Label>
              <Input dir="ltr" value={form.name_en} onChange={e => update("name_en", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "رقم الجوال" : "Mobile"}</Label>
              <Input dir="ltr" value={form.mobile} onChange={e => update("mobile", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "نوع العميل" : "Customer Type"}</Label>
              <Select value={form.customer_type} onValueChange={v => update("customer_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">{isRTL ? "فرد" : "Individual"}</SelectItem>
                  <SelectItem value="company">{isRTL ? "شركة" : "Company"}</SelectItem>
                  <SelectItem value="government">{isRTL ? "حكومي" : "Government"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "رقم اللوحة" : "Plate Number"}</Label>
              <Input dir="ltr" value={form.plate_number} onChange={e => update("plate_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "حد الائتمان" : "Credit Limit"}</Label>
              <Input type="number" dir="ltr" value={form.credit_limit} onChange={e => update("credit_limit", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate("/client/fuel/customers")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateFuelCustomer;
