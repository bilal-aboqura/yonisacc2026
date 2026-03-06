import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, ArrowLeft, Plus, Trash2, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

interface LineItem {
  gold_item_id: string;
  weight_grams: number;
  karat: string;
  price_per_gram: number;
  making_cost: number;
  stone_cost: number;
  total: number;
}

const CreateGoldPurchase = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [branchId, setBranchId] = useState("");
  const [contactId, setContactId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("branches").select("id, name, name_en").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["vendors", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("contacts").select("id, name, name_en").eq("company_id", companyId).eq("type", "vendor").eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: goldItems = [] } = useQuery({
    queryKey: ["gold-items", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("gold_items" as any).select("*").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: goldPrices = [] } = useQuery({
    queryKey: ["gold-prices-latest", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("gold_price_settings" as any).select("*").eq("company_id", companyId).order("price_date", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!companyId,
  });

  const getLatestPrice = (karat: string) => {
    const price = (goldPrices as any[]).find((p: any) => p.karat === karat);
    return price?.price_per_gram || 0;
  };

  useEffect(() => {
    if (branches.length > 0 && !branchId) setBranchId(branches[0].id);
  }, [branches]);

  const addItem = () => {
    setItems([...items, { gold_item_id: "", weight_grams: 0, karat: "21k", price_per_gram: 0, making_cost: 0, stone_cost: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;

    if (field === "gold_item_id" && value) {
      const gi = (goldItems as any[]).find((g: any) => g.id === value);
      if (gi) {
        updated[index].weight_grams = gi.weight_grams;
        updated[index].karat = gi.karat;
        updated[index].price_per_gram = getLatestPrice(gi.karat);
        updated[index].making_cost = gi.making_cost;
        updated[index].stone_cost = gi.stone_cost;
      }
    }

    // Recalculate total
    const item = updated[index];
    item.total = (item.weight_grams * item.price_per_gram) + item.making_cost + item.stone_cost;
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const totalWeight = items.reduce((s, i) => s + i.weight_grams, 0);
  const totalAmount = items.reduce((s, i) => s + i.total, 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !branchId) throw new Error(isRTL ? "اختر الفرع" : "Select branch");
      if (items.length === 0) throw new Error(isRTL ? "أضف صنف واحد على الأقل" : "Add at least one item");

      const invoiceNumber = `GP-${Date.now().toString(36).toUpperCase()}`;

      const { data: inv, error: invErr } = await (supabase as any).from("gold_purchase_invoices").insert({
        company_id: companyId, branch_id: branchId, invoice_number: invoiceNumber,
        invoice_date: invoiceDate, contact_id: contactId || null,
        total_weight: totalWeight, total_amount: totalAmount,
        status: "draft", notes: notes || null, created_by: user?.id,
      }).select("id").single();
      if (invErr) throw invErr;

      const lineItems = items.map(item => ({
        invoice_id: inv.id,
        gold_item_id: item.gold_item_id || null,
        weight_grams: item.weight_grams,
        karat: item.karat,
        price_per_gram: item.price_per_gram,
        making_cost: item.making_cost,
        stone_cost: item.stone_cost,
        total: item.total,
      }));

      const { error: itemsErr } = await (supabase as any).from("gold_purchase_invoice_items").insert(lineItems);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء الفاتورة بنجاح" : "Invoice created successfully");
      queryClient.invalidateQueries({ queryKey: ["gold-purchases"] });
      navigate("/client/gold/purchases");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/gold/purchases")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{isRTL ? "فاتورة شراء ذهب جديدة" : "New Gold Purchase Invoice"}</h1>
      </div>

      {/* Header */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-amber-500" />{isRTL ? "بيانات الفاتورة" : "Invoice Details"}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "الفرع" : "Branch"} *</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : (b.name_en || b.name)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "المورد" : "Supplier"}</label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر المورد" : "Select supplier"} /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{isRTL ? s.name : (s.name_en || s.name)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "التاريخ" : "Date"}</label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isRTL ? "الأصناف" : "Items"}</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 me-1" />{isRTL ? "إضافة" : "Add"}</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
                <TableHead>{isRTL ? "الوزن" : "Weight"}</TableHead>
                <TableHead>{isRTL ? "العيار" : "Karat"}</TableHead>
                <TableHead>{isRTL ? "سعر الجرام" : "Price/g"}</TableHead>
                <TableHead>{isRTL ? "المصنعية" : "Making"}</TableHead>
                <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">{isRTL ? "لم تُضف أصناف بعد" : "No items added yet"}</TableCell></TableRow>
              ) : items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Select value={item.gold_item_id} onValueChange={(v) => updateItem(idx, "gold_item_id", v)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                      <SelectContent>
                        {(goldItems as any[]).map((gi: any) => <SelectItem key={gi.id} value={gi.id}>{isRTL ? gi.name : (gi.name_en || gi.name)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" step="0.01" value={item.weight_grams} onChange={(e) => updateItem(idx, "weight_grams", parseFloat(e.target.value) || 0)} className="w-24" /></TableCell>
                  <TableCell><Badge variant="outline">{item.karat}</Badge></TableCell>
                  <TableCell><Input type="number" step="0.01" value={item.price_per_gram} onChange={(e) => updateItem(idx, "price_per_gram", parseFloat(e.target.value) || 0)} className="w-24" /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={item.making_cost} onChange={(e) => updateItem(idx, "making_cost", parseFloat(e.target.value) || 0)} className="w-24" /></TableCell>
                  <TableCell className="font-semibold">{item.total.toFixed(2)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-amber-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">{isRTL ? "ملاحظات" : "Notes"}</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-72" rows={2} />
            </div>
            <div className="text-end space-y-1">
              <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الوزن" : "Total Weight"}: <span className="font-bold">{totalWeight.toFixed(2)} g</span></p>
              <p className="text-xl font-bold text-amber-700">{isRTL ? "الإجمالي" : "Total"}: {totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
          <Save className="h-4 w-4 me-2" />
          {saveMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ كمسودة" : "Save as Draft")}
        </Button>
        <Button variant="outline" onClick={() => navigate("/client/gold/purchases")}>{isRTL ? "إلغاء" : "Cancel"}</Button>
      </div>
    </div>
  );
};

export default CreateGoldPurchase;
