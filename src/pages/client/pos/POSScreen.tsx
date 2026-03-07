import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  ArrowLeft,
  LogOut,
  User,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  Percent,
  Receipt,
  Clock,
} from "lucide-react";

interface CartItem {
  product_id: string;
  name: string;
  nameEn: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_amount: number;
  total: number;
  notes: string;
}

const POSScreen = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Set default branch
  useEffect(() => {
    if (branches?.length && !selectedBranch) {
      const main = branches.find((b: any) => b.is_main);
      setSelectedBranch(main?.id || branches[0].id);
    }
  }, [branches, selectedBranch]);

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["pos-products", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_categories(name, name_en, image_url)")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch menu prices by order type
  const { data: menuPrices } = useQuery({
    queryKey: ["pos-menu-prices", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pos_menu_prices" as any)
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["pos-categories", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Check active session
  const { data: session } = useQuery({
    queryKey: ["pos-session", companyId, selectedBranch],
    queryFn: async () => {
      const { data } = await supabase
        .from("pos_sessions" as any)
        .select("*")
        .eq("company_id", companyId!)
        .eq("branch_id", selectedBranch)
        .eq("status", "open")
        .eq("opened_by", user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId && !!selectedBranch && !!user,
  });

  useEffect(() => {
    setActiveSession(session);
    if (!session && companyId && selectedBranch) {
      setSessionDialog(true);
    }
  }, [session, companyId, selectedBranch]);

  // Open session
  const openSessionMutation = useMutation({
    mutationFn: async () => {
      // Get or create terminal
      let { data: terminal } = await supabase
        .from("pos_terminals" as any)
        .select("id")
        .eq("company_id", companyId!)
        .eq("branch_id", selectedBranch)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!terminal) {
        const { data: newTerminal } = await supabase
          .from("pos_terminals" as any)
          .insert({
            company_id: companyId,
            branch_id: selectedBranch,
            name: "نقطة بيع رئيسية",
            name_en: "Main POS Terminal",
            terminal_type: "retail",
          } as any)
          .select()
          .single();
        terminal = newTerminal;
      }

      const { data, error } = await supabase
        .from("pos_sessions" as any)
        .insert({
          company_id: companyId,
          branch_id: selectedBranch,
          terminal_id: (terminal as any).id,
          opened_by: user?.id,
          opening_amount: parseFloat(openingAmount) || 0,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveSession(data);
      setSessionDialog(false);
      toast.success(isRTL ? "تم فتح الصندوق" : "Session opened");
      queryClient.invalidateQueries({ queryKey: ["pos-session"] });
    },
    onError: () => {
      toast.error(isRTL ? "خطأ في فتح الصندوق" : "Error opening session");
    },
  });

  // Filter products
  const filteredProducts = (products || []).filter((p: any) => {
    const matchSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm);
    const matchCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchSearch && matchCategory;
  });

  // Cart operations
  const addToCart = useCallback((product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price - i.discount + i.tax_amount }
            : i
        );
      }
      const price = product.sale_price || product.price || 0;
      const taxRate = product.is_taxable !== false ? 0.15 : 0;
      const tax = price * taxRate;
      return [...prev, {
        product_id: product.id,
        name: product.name,
        nameEn: product.name_en || product.name,
        quantity: 1,
        unit_price: price,
        discount: 0,
        tax_amount: tax,
        total: price + tax,
        notes: "",
      }];
    });
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      const taxRate = i.tax_amount > 0 ? 0.15 : 0;
      const subtotal = newQty * i.unit_price;
      const tax = subtotal * taxRate;
      return { ...i, quantity: newQty, tax_amount: tax, total: subtotal - i.discount + tax };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  // Totals
  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const totalDiscount = subtotal * (discountPercent / 100) + cart.reduce((s, i) => s + i.discount, 0);
  const totalTax = cart.reduce((s, i) => s + i.tax_amount, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;
  const changeAmount = Math.max(0, (parseFloat(paidAmount) || 0) - grandTotal);

  // Complete sale
  const completeSaleMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error("No active session");

      // Get next transaction number
      const { data: lastTx } = await supabase
        .from("pos_transactions" as any)
        .select("transaction_number")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastNum = lastTx ? parseInt((lastTx as any).transaction_number?.replace("POS-", "") || "0") : 0;
      const txNumber = `POS-${String(lastNum + 1).padStart(6, "0")}`;

      const { data: tx, error } = await supabase
        .from("pos_transactions" as any)
        .insert({
          company_id: companyId,
          branch_id: selectedBranch,
          session_id: (activeSession as any).id,
          terminal_id: (activeSession as any).terminal_id,
          transaction_number: txNumber,
          subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          payment_method: paymentMethod,
          paid_amount: parseFloat(paidAmount) || grandTotal,
          change_amount: changeAmount,
          order_type: orderType,
          created_by: user?.id,
          status: "completed",
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Insert items
      const items = cart.map(i => ({
        transaction_id: (tx as any).id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount,
        tax_amount: i.tax_amount,
        total: i.total,
        notes: i.notes,
      }));

      await supabase.from("pos_transaction_items" as any).insert(items as any);

      // Log activity
      await supabase.from("pos_activity_log" as any).insert({
        company_id: companyId,
        session_id: (activeSession as any).id,
        user_id: user?.id,
        action: "complete_sale",
        details: { transaction_number: txNumber, total: grandTotal, items: cart.length },
      } as any);

      return tx;
    },
    onSuccess: (tx) => {
      toast.success(isRTL ? `تم البيع بنجاح - ${(tx as any).transaction_number}` : `Sale completed - ${(tx as any).transaction_number}`);
      setCart([]);
      setPaymentDialog(false);
      setPaidAmount("");
      setDiscountPercent(0);
      queryClient.invalidateQueries({ queryKey: ["pos-session"] });
    },
    onError: () => {
      toast.error(isRTL ? "خطأ في إتمام العملية" : "Error completing sale");
    },
  });

  // Close session
  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const { error } = await supabase
        .from("pos_sessions" as any)
        .update({
          status: "closed",
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
          closing_amount: (activeSession as any).opening_amount,
        } as any)
        .eq("id", (activeSession as any).id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إغلاق الصندوق" : "Session closed");
      setActiveSession(null);
      navigate("/client");
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); if (cart.length) { setPaymentMethod("cash"); setPaymentDialog(true); } }
      if (e.key === "F2") { e.preventDefault(); if (cart.length) { setPaymentMethod("card"); setPaymentDialog(true); } }
      if (e.key === "Escape") { setPaymentDialog(false); setSessionDialog(false); }
      if (e.key === "F5") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart.length]);

  const branchName = branches?.find((b: any) => b.id === selectedBranch);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Bar */}
      <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20" onClick={() => navigate("/client")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-lg">{isRTL ? "نقطة البيع" : "Point of Sale"}</span>
          {branchName && (
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
              {isRTL ? (branchName as any).name : (branchName as any).name_en || (branchName as any).name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeSession && (
            <Badge variant="outline" className="border-primary-foreground/40 text-primary-foreground">
              <Clock className="h-3 w-3 me-1" />
              {isRTL ? "الجلسة نشطة" : "Session Active"}
            </Badge>
          )}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[160px] bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches?.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{isRTL ? b.name : b.name_en || b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-destructive/80"
            onClick={() => closeSessionMutation.mutate()}
          >
            <LogOut className="h-4 w-4 me-1" />
            {isRTL ? "إغلاق الصندوق" : "Close Register"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Section (Left) */}
        <div className="flex-[65] flex flex-col border-e">
          {/* Search & Categories */}
          <div className="p-3 border-b space-y-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder={isRTL ? "بحث بالاسم أو الباركود... (F5)" : "Search by name or barcode... (F5)"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
              >
                {isRTL ? "الكل" : "All"}
              </Button>
              {categories?.map((cat: any) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {isRTL ? cat.name : cat.name_en || cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <ScrollArea className="flex-1 p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filteredProducts.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={cn(
                    "rounded-lg border bg-card p-3 text-start transition-all hover:shadow-md hover:border-primary/50 active:scale-95",
                    "flex flex-col gap-1.5"
                  )}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-20 object-cover rounded" />
                  ) : (
                    <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate w-full">
                    {isRTL ? product.name : product.name_en || product.name}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {(product.sale_price || product.price || 0).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{isRTL ? "ر.س" : "SAR"}</span>
                  </span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center text-muted-foreground">
                  {isRTL ? "لا توجد منتجات" : "No products found"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Section (Right) */}
        <div className="flex-[35] flex flex-col bg-card max-w-[450px]">
          {/* Order Type */}
          <div className="p-3 border-b">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { key: "dine_in" as const, icon: UtensilsCrossed, label: "محلي", labelEn: "Dine In" },
                { key: "takeaway" as const, icon: ShoppingBag, label: "سفري", labelEn: "Takeaway" },
                { key: "delivery" as const, icon: Truck, label: "توصيل", labelEn: "Delivery" },
              ].map((type) => (
                <Button
                  key={type.key}
                  size="sm"
                  variant={orderType === type.key ? "default" : "ghost"}
                  className="flex-1 gap-1.5"
                  onClick={() => setOrderType(type.key)}
                >
                  <type.icon className="h-3.5 w-3.5" />
                  {isRTL ? type.label : type.labelEn}
                </Button>
              ))}
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{isRTL ? "السلة فارغة" : "Cart is empty"}</p>
                <p className="text-xs">{isRTL ? "اضغط على المنتج لإضافته" : "Click a product to add"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{isRTL ? item.name : item.nameEn}</p>
                      <p className="text-xs text-muted-foreground">{item.unit_price.toFixed(2)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold w-16 text-end">{(item.quantity * item.unit_price).toFixed(2)}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product_id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Discount */}
          {cart.length > 0 && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder={isRTL ? "نسبة الخصم %" : "Discount %"}
                  value={discountPercent || ""}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="p-3 border-t space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? "المجموع الفرعي" : "Subtotal"}</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>{isRTL ? "الخصم" : "Discount"}</span>
                <span>-{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? "الضريبة (15%)" : "VAT (15%)"}</span>
              <span>{totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1.5 border-t">
              <span>{isRTL ? "الإجمالي" : "Total"}</span>
              <span className="text-primary">{grandTotal.toFixed(2)} <span className="text-xs font-normal">{isRTL ? "ر.س" : "SAR"}</span></span>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="p-3 border-t grid grid-cols-2 gap-2">
            <Button
              className="h-12 gap-2"
              disabled={cart.length === 0}
              onClick={() => { setPaymentMethod("cash"); setPaidAmount(""); setPaymentDialog(true); }}
            >
              <Banknote className="h-5 w-5" />
              {isRTL ? "نقد (F1)" : "Cash (F1)"}
            </Button>
            <Button
              variant="secondary"
              className="h-12 gap-2"
              disabled={cart.length === 0}
              onClick={() => { setPaymentMethod("card"); setPaidAmount(grandTotal.toFixed(2)); setPaymentDialog(true); }}
            >
              <CreditCard className="h-5 w-5" />
              {isRTL ? "بطاقة (F2)" : "Card (F2)"}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "إتمام عملية الدفع" : "Complete Payment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{isRTL ? "المبلغ المطلوب" : "Amount Due"}</p>
              <p className="text-3xl font-bold text-primary">{grandTotal.toFixed(2)} <span className="text-sm">{isRTL ? "ر.س" : "SAR"}</span></p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "طريقة الدفع" : "Payment Method"}</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "cash", label: "نقد", labelEn: "Cash" },
                  { key: "card", label: "بطاقة", labelEn: "Card" },
                  { key: "transfer", label: "تحويل", labelEn: "Transfer" },
                  { key: "other", label: "أخرى", labelEn: "Other" },
                ].map((m) => (
                  <Button key={m.key} size="sm" variant={paymentMethod === m.key ? "default" : "outline"} onClick={() => setPaymentMethod(m.key)}>
                    {isRTL ? m.label : m.labelEn}
                  </Button>
                ))}
              </div>
            </div>
            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{isRTL ? "المبلغ المدفوع" : "Paid Amount"}</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={grandTotal.toFixed(2)}
                  className="text-lg text-center"
                  autoFocus
                />
                {changeAmount > 0 && (
                  <div className="text-center p-2 bg-success/10 rounded">
                    <span className="text-sm text-muted-foreground">{isRTL ? "الباقي: " : "Change: "}</span>
                    <span className="font-bold text-success">{changeAmount.toFixed(2)}</span>
                  </div>
                )}
                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-1">
                  {[5, 10, 20, 50, 100, 200, 500].map((amt) => (
                    <Button key={amt} size="sm" variant="outline" onClick={() => setPaidAmount(String(amt))}>
                      {amt}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setPaidAmount(grandTotal.toFixed(2))}>
                    {isRTL ? "المبلغ" : "Exact"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="gap-2"
              onClick={() => completeSaleMutation.mutate()}
              disabled={completeSaleMutation.isPending || (paymentMethod === "cash" && parseFloat(paidAmount || "0") < grandTotal)}
            >
              <Receipt className="h-4 w-4" />
              {completeSaleMutation.isPending ? (isRTL ? "جاري..." : "Processing...") : (isRTL ? "تأكيد الدفع" : "Confirm Payment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Session Dialog */}
      <Dialog open={sessionDialog} onOpenChange={(open) => { if (!open && !activeSession) navigate("/client"); setSessionDialog(open); }}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "فتح الصندوق" : "Open Register"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isRTL ? "أدخل المبلغ الموجود في الصندوق لبدء الجلسة" : "Enter the opening cash amount to start the session"}
            </p>
            <Input
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0.00"
              className="text-lg text-center"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSessionDialog(false); navigate("/client"); }}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={() => openSessionMutation.mutate()} disabled={openSessionMutation.isPending}>
              {openSessionMutation.isPending ? (isRTL ? "جاري الفتح..." : "Opening...") : (isRTL ? "فتح الصندوق" : "Open Register")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSScreen;
