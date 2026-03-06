import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Package, Weight, DollarSign, Gem } from "lucide-react";

const ITEM_TYPES: Record<string, { ar: string; en: string }> = {
  ring: { ar: "خاتم", en: "Ring" },
  necklace: { ar: "عقد", en: "Necklace" },
  bracelet: { ar: "سوار", en: "Bracelet" },
  earring: { ar: "حلق", en: "Earring" },
  chain: { ar: "سلسلة", en: "Chain" },
  pendant: { ar: "تعليقة", en: "Pendant" },
  set: { ar: "طقم", en: "Set" },
  other: { ar: "أخرى", en: "Other" },
};

const GoldItems = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [karatFilter, setKaratFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gold-items", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("gold_items" as any)
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const filtered = (items as any[]).filter((item: any) => {
    const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.barcode?.includes(search);
    const matchKarat = karatFilter === "all" || item.karat === karatFilter;
    const matchType = typeFilter === "all" || item.item_type === typeFilter;
    return matchSearch && matchKarat && matchType;
  });

  const totalWeight = filtered.reduce((s: number, i: any) => s + (i.weight_grams || 0), 0);
  const totalValue = filtered.reduce((s: number, i: any) => s + (i.gold_cost || 0) + (i.making_cost || 0) + (i.stone_cost || 0), 0);
  const totalItems = filtered.length;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "أصناف الذهب" : "Gold Items"}</h1>
          <p className="text-muted-foreground">{isRTL ? "إدارة أصناف ومنتجات الذهب" : "Manage gold items and products"}</p>
        </div>
        <Button onClick={() => navigate("/client/gold/items/new")} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة صنف" : "Add Item"}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Package className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-sm text-muted-foreground">{isRTL ? "عدد الأصناف" : "Total Items"}</p><p className="text-xl font-bold">{totalItems}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Weight className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الوزن" : "Total Weight"}</p><p className="text-xl font-bold">{totalWeight.toFixed(2)} {isRTL ? "جرام" : "g"}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><DollarSign className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي القيمة" : "Total Value"}</p><p className="text-xl font-bold">{totalValue.toFixed(2)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isRTL ? "بحث بالاسم أو الباركود..." : "Search by name or barcode..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={karatFilter} onValueChange={setKaratFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder={isRTL ? "العيار" : "Karat"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
            <SelectItem value="24k">24k</SelectItem>
            <SelectItem value="22k">22k</SelectItem>
            <SelectItem value="21k">21k</SelectItem>
            <SelectItem value="18k">18k</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder={isRTL ? "النوع" : "Type"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "الكل" : "All"}</SelectItem>
            {Object.entries(ITEM_TYPES).map(([key, val]) => (
              <SelectItem key={key} value={key}>{isRTL ? val.ar : val.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "العيار" : "Karat"}</TableHead>
                <TableHead>{isRTL ? "الوزن (جرام)" : "Weight (g)"}</TableHead>
                <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                <TableHead>{isRTL ? "تكلفة المصنعية" : "Making Cost"}</TableHead>
                <TableHead>{isRTL ? "تكلفة الذهب" : "Gold Cost"}</TableHead>
                <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
                <TableHead>{isRTL ? "الباركود" : "Barcode"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isRTL ? "لا توجد أصناف" : "No items found"}</TableCell></TableRow>
              ) : filtered.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{isRTL ? item.name : (item.name_en || item.name)}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{item.karat}</Badge></TableCell>
                  <TableCell>{Number(item.weight_grams).toFixed(2)}</TableCell>
                  <TableCell>{isRTL ? ITEM_TYPES[item.item_type]?.ar : ITEM_TYPES[item.item_type]?.en}</TableCell>
                  <TableCell>{Number(item.making_cost).toFixed(2)}</TableCell>
                  <TableCell>{Number(item.gold_cost).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">{(Number(item.gold_cost) + Number(item.making_cost) + Number(item.stone_cost)).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">{item.barcode || "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/client/gold/items/${item.id}/edit`)}>
                      {isRTL ? "تعديل" : "Edit"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoldItems;
