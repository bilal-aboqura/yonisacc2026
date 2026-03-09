import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Loader2, Container } from "lucide-react";

const RefillTank = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useCompanyId();
  const { id: tankId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const { data: tank } = useQuery({
    queryKey: ["fuel-tank", tankId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_tanks").select("*").eq("id", tankId).single();
      return data;
    },
    enabled: !!tankId,
  });

  const totalCost = (parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(quantity);
      const uc = parseFloat(unitCost);
      if (!qty || qty <= 0) throw new Error(isRTL ? "أدخل كمية صحيحة" : "Enter valid quantity");

      const { data: settings } = await (supabase as any).from("fuel_station_account_settings").select("*").eq("company_id", companyId).maybeSingle();

      let journalEntryId = null;
      if (settings?.fuel_inventory_account_id && settings?.fuel_supplier_payable_account_id && totalCost > 0) {
        const { data: je, error: jeError } = await supabase.from("journal_entries").insert({
          company_id: companyId!,
          date: new Date().toISOString().split("T")[0],
          description: `${isRTL ? "تعبئة خزان وقود - " : "Fuel tank refill - "}${tank?.tank_name}`,
          is_posted: true,
          source: "fuel_tank_refill",
        }).select("id").single();
        if (jeError) throw jeError;
        journalEntryId = je.id;

        await supabase.from("journal_entry_lines").insert([
          { journal_entry_id: je.id, account_id: settings.fuel_inventory_account_id, debit: totalCost, credit: 0, company_id: companyId },
          { journal_entry_id: je.id, account_id: settings.fuel_supplier_payable_account_id, debit: 0, credit: totalCost, company_id: companyId },
        ]);
      }

      // Update tank qty
      const newQty = Number(tank.current_qty) + qty;
      await (supabase as any).from("fuel_tanks").update({ current_qty: newQty, updated_at: new Date().toISOString() }).eq("id", tankId);

      // Record refill
      await (supabase as any).from("fuel_tank_refills").insert({
        company_id: companyId, tank_id: tankId, quantity: qty,
        supplier_name: supplier, unit_cost: uc || 0, total_cost: totalCost,
        journal_entry_id: journalEntryId, notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-tanks"] });
      toast({ title: isRTL ? "تمت التعبئة" : "Tank Refilled" });
      navigate("/client/fuel/tanks");
    },
    onError: (e: any) => toast({ title: isRTL ? "خطأ" : "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/fuel/tanks")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Container className="h-6 w-6" />
          {isRTL ? "تعبئة خزان" : "Refill Tank"}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tank?.tank_name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "الكمية الحالية:" : "Current qty:"} {Number(tank?.current_qty || 0).toLocaleString()} / {Number(tank?.capacity || 0).toLocaleString()} L
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الكمية (لتر) *" : "Quantity (L) *"}</Label>
              <Input type="number" dir="ltr" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "تكلفة اللتر" : "Unit Cost"}</Label>
              <Input type="number" dir="ltr" value={unitCost} onChange={e => setUnitCost(e.target.value)} step="0.01" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "المورد" : "Supplier"}</Label>
            <Input value={supplier} onChange={e => setSupplier(e.target.value)} />
          </div>
          <div className="p-3 rounded-md bg-muted text-sm">
            {isRTL ? "إجمالي التكلفة:" : "Total Cost:"} <span className="font-bold">{totalCost.toLocaleString()} SAR</span>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!quantity || parseFloat(quantity) <= 0 || mutation.isPending} className="w-full gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRTL ? "تأكيد التعبئة" : "Confirm Refill"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefillTank;
