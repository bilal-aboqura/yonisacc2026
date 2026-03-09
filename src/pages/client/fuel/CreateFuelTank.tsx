import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";

const CreateFuelTank = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ tank_name: "", fuel_type: "gasoline_91", capacity: "0", current_qty: "0", min_alert_level: "500" });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("fuel_tanks").insert({
        tank_name: form.tank_name, fuel_type: form.fuel_type,
        capacity: parseFloat(form.capacity) || 0, current_qty: parseFloat(form.current_qty) || 0,
        min_alert_level: parseFloat(form.min_alert_level) || 500, company_id: companyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-tanks"] });
      toast({ title: isRTL ? "تم الحفظ" : "Saved" });
      navigate("/client/fuel/tanks");
    },
    onError: (e: any) => toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" }),
  });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/fuel/tanks")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold">{isRTL ? "إضافة خزان" : "Add Tank"}</h1>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>{isRTL ? "اسم الخزان *" : "Tank Name *"}</Label>
            <Input value={form.tank_name} onChange={e => update("tank_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "نوع الوقود" : "Fuel Type"}</Label>
            <Select value={form.fuel_type} onValueChange={v => update("fuel_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gasoline_91">{isRTL ? "بنزين 91" : "Gasoline 91"}</SelectItem>
                <SelectItem value="gasoline_95">{isRTL ? "بنزين 95" : "Gasoline 95"}</SelectItem>
                <SelectItem value="diesel">{isRTL ? "ديزل" : "Diesel"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "السعة (لتر)" : "Capacity (L)"}</Label>
              <Input type="number" dir="ltr" value={form.capacity} onChange={e => update("capacity", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الكمية الحالية (لتر)" : "Current Qty (L)"}</Label>
              <Input type="number" dir="ltr" value={form.current_qty} onChange={e => update("current_qty", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "حد التنبيه (لتر)" : "Alert Level (L)"}</Label>
            <Input type="number" dir="ltr" value={form.min_alert_level} onChange={e => update("min_alert_level", e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate("/client/fuel/tanks")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.tank_name || mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateFuelTank;
