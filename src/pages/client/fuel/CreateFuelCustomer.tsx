import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AccountCombobox from "@/components/client/AccountCombobox";

const CreateFuelCustomer = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "", name_en: "", mobile: "", customer_type: "individual",
    credit_limit: "0", notes: "", account_id: null as string | null,
  });
  const [plates, setPlates] = useState<string[]>([""]);

  const { data: existing } = useQuery({
    queryKey: ["fuel-customer", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_customers").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  // Fetch accounts for combobox
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-list", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, code, name, name_en")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("code");
      return data || [];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "", name_en: existing.name_en || "",
        mobile: existing.mobile || "", customer_type: existing.customer_type || "individual",
        credit_limit: String(existing.credit_limit || 0),
        notes: existing.notes || "",
        account_id: existing.account_id || null,
      });
      const existingPlates = existing.plate_number ? existing.plate_number.split("،").map((p: string) => p.trim()).filter(Boolean) : [""];
      setPlates(existingPlates.length ? existingPlates : [""]);
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const plateNumber = plates.filter(p => p.trim()).join("، ");
      const payload = {
        ...form, plate_number: plateNumber,
        credit_limit: parseFloat(form.credit_limit) || 0,
        company_id: companyId,
        account_id: form.account_id || null,
      };
      if (isEdit) {
        const { error } = await (supabase as any).from("fuel_customers").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: customer, error } = await (supabase as any).from("fuel_customers").insert(payload).select("id").single();
        if (error) throw error;
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

  const addPlate = () => setPlates(prev => [...prev, ""]);
  const removePlate = (index: number) => setPlates(prev => prev.filter((_, i) => i !== index));
  const updatePlate = (index: number, value: string) => setPlates(prev => prev.map((p, i) => i === index ? value : p));

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

          {/* Account Link */}
          <div className="space-y-2">
            <Label>{isRTL ? "الحساب المرتبط (دليل الحسابات)" : "Linked Account (Chart of Accounts)"}</Label>
            <AccountCombobox
              accounts={accounts}
              value={form.account_id}
              onChange={(v) => setForm(p => ({ ...p, account_id: v }))}
              isRTL={isRTL}
              placeholder={isRTL ? "اختر الحساب..." : "Select account..."}
              showNone
              noneLabel={isRTL ? "بدون حساب" : "No account"}
            />
          </div>

          {/* Multiple Plate Numbers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{isRTL ? "أرقام اللوحات" : "Plate Numbers"}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPlate} className="gap-1">
                <Plus className="h-3 w-3" />
                {isRTL ? "إضافة لوحة" : "Add Plate"}
              </Button>
            </div>
            <div className="space-y-2">
              {plates.map((plate, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    dir="ltr"
                    value={plate}
                    onChange={e => updatePlate(index, e.target.value)}
                    placeholder={isRTL ? `لوحة ${index + 1}` : `Plate ${index + 1}`}
                  />
                  {plates.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePlate(index)} className="shrink-0">
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
