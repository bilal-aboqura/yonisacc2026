import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Monitor, Printer, Settings, Save, Wifi, WifiOff, Usb, FileText, Receipt } from "lucide-react";
import BranchSelector from "@/components/client/BranchSelector";

interface PrinterConfig {
  id: string;
  name: string;
  name_en: string;
  type: "thermal" | "laser" | "dot_matrix";
  connection: "usb" | "network" | "bluetooth";
  ip_address?: string;
  port?: string;
  paper_width: "58mm" | "80mm" | "A4";
  is_default: boolean;
  is_active: boolean;
  print_receipt: boolean;
  print_kitchen: boolean;
  auto_print: boolean;
  copies: number;
}

interface GeneralSettings {
  default_tax_rate: number;
  auto_open_session: boolean;
  require_customer: boolean;
  allow_negative_stock: boolean;
  show_product_image: boolean;
  show_product_sku: boolean;
  default_order_type: "dine_in" | "takeaway" | "delivery";
  receipt_header: string;
  receipt_footer: string;
  receipt_show_logo: boolean;
  receipt_show_tax_details: boolean;
  receipt_show_barcode: boolean;
  sound_on_scan: boolean;
  sound_on_payment: boolean;
  auto_logout_minutes: number;
  allow_discount_without_approval: boolean;
  max_discount_percent: number;
  enable_tips: boolean;
  enable_delivery_fee: boolean;
  default_delivery_fee: number;
}

const defaultPrinter: Omit<PrinterConfig, "id"> = {
  name: "",
  name_en: "",
  type: "thermal",
  connection: "network",
  ip_address: "",
  port: "9100",
  paper_width: "80mm",
  is_default: false,
  is_active: true,
  print_receipt: true,
  print_kitchen: false,
  auto_print: true,
  copies: 1,
};

const defaultGeneralSettings: GeneralSettings = {
  default_tax_rate: 15,
  auto_open_session: true,
  require_customer: false,
  allow_negative_stock: false,
  show_product_image: true,
  show_product_sku: false,
  default_order_type: "dine_in",
  receipt_header: "",
  receipt_footer: "",
  receipt_show_logo: true,
  receipt_show_tax_details: true,
  receipt_show_barcode: true,
  sound_on_scan: true,
  sound_on_payment: true,
  auto_logout_minutes: 0,
  allow_discount_without_approval: false,
  max_discount_percent: 50,
  enable_tips: false,
  enable_delivery_fee: true,
  default_delivery_fee: 15,
};

const POSSettings = () => {
  const { isRTL } = useLanguage();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [terminalDialog, setTerminalDialog] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<any>(null);
  const [form, setForm] = useState({ name: "", name_en: "", terminal_type: "retail", is_active: true });

  // Printer state
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [printerDialog, setPrinterDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null);
  const [printerForm, setPrinterForm] = useState<Omit<PrinterConfig, "id">>(defaultPrinter);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneralSettings);
  const [generalDirty, setGeneralDirty] = useState(false);

  // Load printers from terminal printer_config
  const { data: terminals } = useQuery({
    queryKey: ["pos-terminals", companyId, selectedBranch],
    queryFn: async () => {
      let query = supabase.from("pos_terminals" as any).select("*, branches(name, name_en)").eq("company_id", companyId!);
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      const { data } = await query.order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Load general settings from company_settings or localStorage
  useState(() => {
    const saved = localStorage.getItem(`pos_general_settings_${companyId}`);
    if (saved) {
      try { setGeneralSettings(JSON.parse(saved)); } catch {}
    }
    const savedPrinters = localStorage.getItem(`pos_printers_${companyId}`);
    if (savedPrinters) {
      try { setPrinters(JSON.parse(savedPrinters)); } catch {}
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_id: companyId, branch_id: selectedBranch } as any;
      if (editingTerminal) {
        const { error } = await supabase.from("pos_terminals" as any).update(payload).eq("id", editingTerminal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pos_terminals" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحفظ" : "Saved");
      setTerminalDialog(false);
      setEditingTerminal(null);
      queryClient.invalidateQueries({ queryKey: ["pos-terminals"] });
    },
    onError: () => toast.error(isRTL ? "خطأ" : "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_terminals" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: ["pos-terminals"] });
    },
  });

  // Printer helpers
  const handleSavePrinter = () => {
    let updated: PrinterConfig[];
    if (editingPrinter) {
      updated = printers.map(p => p.id === editingPrinter.id ? { ...printerForm, id: editingPrinter.id } : p);
    } else {
      const newPrinter: PrinterConfig = { ...printerForm, id: crypto.randomUUID() };
      if (printers.length === 0) newPrinter.is_default = true;
      updated = [...printers, newPrinter];
    }
    // If setting as default, unset others
    if (printerForm.is_default) {
      const targetId = editingPrinter?.id || updated[updated.length - 1].id;
      updated = updated.map(p => ({ ...p, is_default: p.id === targetId }));
    }
    setPrinters(updated);
    localStorage.setItem(`pos_printers_${companyId}`, JSON.stringify(updated));
    setPrinterDialog(false);
    setEditingPrinter(null);
    toast.success(isRTL ? "تم حفظ الطابعة" : "Printer saved");
  };

  const handleDeletePrinter = (id: string) => {
    const updated = printers.filter(p => p.id !== id);
    setPrinters(updated);
    localStorage.setItem(`pos_printers_${companyId}`, JSON.stringify(updated));
    toast.success(isRTL ? "تم حذف الطابعة" : "Printer deleted");
  };

  const handleSaveGeneral = () => {
    localStorage.setItem(`pos_general_settings_${companyId}`, JSON.stringify(generalSettings));
    setGeneralDirty(false);
    toast.success(isRTL ? "تم حفظ الإعدادات العامة" : "General settings saved");
  };

  const updateGeneral = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setGeneralSettings(prev => ({ ...prev, [key]: value }));
    setGeneralDirty(true);
  };

  const connectionIcon = (conn: string) => {
    switch (conn) {
      case "network": return <Wifi className="h-4 w-4" />;
      case "usb": return <Usb className="h-4 w-4" />;
      case "bluetooth": return <WifiOff className="h-4 w-4" />;
      default: return <Printer className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isRTL ? "إعدادات نقاط البيع" : "POS Settings"}</h1>
        <p className="text-sm text-muted-foreground">{isRTL ? "إدارة نقاط البيع والطابعات والإعدادات" : "Manage terminals, printers, and settings"}</p>
      </div>

      <Tabs defaultValue="terminals" dir={isRTL ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="terminals" className="gap-2"><Monitor className="h-4 w-4" />{isRTL ? "نقاط البيع" : "Terminals"}</TabsTrigger>
          <TabsTrigger value="printers" className="gap-2"><Printer className="h-4 w-4" />{isRTL ? "الطابعات" : "Printers"}</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" />{isRTL ? "عام" : "General"}</TabsTrigger>
        </TabsList>

        {/* ========== TERMINALS TAB ========== */}
        <TabsContent value="terminals" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <BranchSelector companyId={companyId!} value={selectedBranch} onChange={setSelectedBranch} />
            <Button onClick={() => { setEditingTerminal(null); setForm({ name: "", name_en: "", terminal_type: "retail", is_active: true }); setTerminalDialog(true); }}>
              <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة نقطة بيع" : "Add Terminal"}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(terminals || []).map((terminal: any) => (
              <Card key={terminal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{isRTL ? terminal.name : terminal.name_en || terminal.name}</CardTitle>
                    <Badge variant={terminal.is_active ? "default" : "secondary"}>
                      {terminal.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                    </Badge>
                  </div>
                  <CardDescription>
                    {terminal.terminal_type === "restaurant" ? (isRTL ? "مطعم" : "Restaurant") : (isRTL ? "تجزئة" : "Retail")}
                    {terminal.branches && ` - ${isRTL ? (terminal.branches as any).name : (terminal.branches as any).name_en || (terminal.branches as any).name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingTerminal(terminal); setForm({ name: terminal.name, name_en: terminal.name_en || "", terminal_type: terminal.terminal_type, is_active: terminal.is_active }); setTerminalDialog(true); }}>
                      <Edit className="h-3 w-3 me-1" /> {isRTL ? "تعديل" : "Edit"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMutation.mutate(terminal.id)}>
                      <Trash2 className="h-3 w-3 me-1" /> {isRTL ? "حذف" : "Delete"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(terminals || []).length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{isRTL ? "لا توجد نقاط بيع" : "No terminals found"}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========== PRINTERS TAB ========== */}
        <TabsContent value="printers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{isRTL ? "إدارة الطابعات" : "Printer Management"}</h2>
              <p className="text-sm text-muted-foreground">{isRTL ? "إعداد وربط الطابعات بنقاط البيع" : "Configure and connect printers to POS"}</p>
            </div>
            <Button onClick={() => { setEditingPrinter(null); setPrinterForm({ ...defaultPrinter }); setPrinterDialog(true); }}>
              <Plus className="h-4 w-4 me-2" /> {isRTL ? "إضافة طابعة" : "Add Printer"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {printers.map(printer => (
              <Card key={printer.id} className={printer.is_default ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {connectionIcon(printer.connection)}
                      <CardTitle className="text-base">{isRTL ? printer.name : printer.name_en || printer.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      {printer.is_default && <Badge variant="default">{isRTL ? "افتراضية" : "Default"}</Badge>}
                      <Badge variant={printer.is_active ? "outline" : "secondary"}>
                        {printer.is_active ? (isRTL ? "نشطة" : "Active") : (isRTL ? "معطلة" : "Inactive")}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {printer.type === "thermal" ? (isRTL ? "حرارية" : "Thermal") : printer.type === "laser" ? (isRTL ? "ليزر" : "Laser") : (isRTL ? "نقطية" : "Dot Matrix")}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {printer.connection === "network" ? (isRTL ? "شبكة" : "Network") : printer.connection === "usb" ? "USB" : (isRTL ? "بلوتوث" : "Bluetooth")}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{printer.paper_width}</span>
                    {printer.ip_address && <span className="text-xs bg-muted px-2 py-0.5 rounded">{printer.ip_address}:{printer.port}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {printer.print_receipt && <Badge variant="outline" className="text-xs gap-1"><Receipt className="h-3 w-3" />{isRTL ? "إيصال" : "Receipt"}</Badge>}
                    {printer.print_kitchen && <Badge variant="outline" className="text-xs gap-1"><FileText className="h-3 w-3" />{isRTL ? "مطبخ" : "Kitchen"}</Badge>}
                    {printer.auto_print && <Badge variant="outline" className="text-xs">{isRTL ? "طباعة تلقائية" : "Auto Print"}</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingPrinter(printer); setPrinterForm({ name: printer.name, name_en: printer.name_en, type: printer.type, connection: printer.connection, ip_address: printer.ip_address, port: printer.port, paper_width: printer.paper_width, is_default: printer.is_default, is_active: printer.is_active, print_receipt: printer.print_receipt, print_kitchen: printer.print_kitchen, auto_print: printer.auto_print, copies: printer.copies }); setPrinterDialog(true); }}>
                      <Edit className="h-3 w-3 me-1" /> {isRTL ? "تعديل" : "Edit"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeletePrinter(printer.id)}>
                      <Trash2 className="h-3 w-3 me-1" /> {isRTL ? "حذف" : "Delete"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {printers.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <Printer className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{isRTL ? "لم يتم إضافة طابعات بعد" : "No printers configured yet"}</p>
                <p className="text-xs mt-1">{isRTL ? "أضف طابعة لطباعة الإيصالات وطلبات المطبخ" : "Add a printer for receipts and kitchen orders"}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========== GENERAL TAB ========== */}
        <TabsContent value="general" className="space-y-6 mt-4">
          {/* Sales Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "إعدادات المبيعات" : "Sales Settings"}</CardTitle>
              <CardDescription>{isRTL ? "التحكم في سلوك عمليات البيع" : "Control sales operation behavior"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{isRTL ? "نسبة الضريبة الافتراضية (%)" : "Default Tax Rate (%)"}</Label>
                  <Input type="number" value={generalSettings.default_tax_rate} onChange={(e) => updateGeneral("default_tax_rate", Number(e.target.value))} min={0} max={100} />
                </div>
                <div>
                  <Label>{isRTL ? "نوع الطلب الافتراضي" : "Default Order Type"}</Label>
                  <Select value={generalSettings.default_order_type} onValueChange={(v) => updateGeneral("default_order_type", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine_in">{isRTL ? "محلي" : "Dine In"}</SelectItem>
                      <SelectItem value="takeaway">{isRTL ? "سفري" : "Takeaway"}</SelectItem>
                      <SelectItem value="delivery">{isRTL ? "توصيل" : "Delivery"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isRTL ? "أقصى نسبة خصم (%)" : "Max Discount (%)"}</Label>
                  <Input type="number" value={generalSettings.max_discount_percent} onChange={(e) => updateGeneral("max_discount_percent", Number(e.target.value))} min={0} max={100} />
                </div>
                <div>
                  <Label>{isRTL ? "رسوم التوصيل الافتراضية" : "Default Delivery Fee"}</Label>
                  <Input type="number" value={generalSettings.default_delivery_fee} onChange={(e) => updateGeneral("default_delivery_fee", Number(e.target.value))} min={0} />
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "فتح جلسة تلقائياً" : "Auto Open Session"}</Label>
                  <Switch checked={generalSettings.auto_open_session} onCheckedChange={(v) => updateGeneral("auto_open_session", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "إلزام اختيار عميل" : "Require Customer"}</Label>
                  <Switch checked={generalSettings.require_customer} onCheckedChange={(v) => updateGeneral("require_customer", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "السماح بالبيع بمخزون سالب" : "Allow Negative Stock"}</Label>
                  <Switch checked={generalSettings.allow_negative_stock} onCheckedChange={(v) => updateGeneral("allow_negative_stock", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "السماح بالخصم بدون موافقة" : "Allow Discount Without Approval"}</Label>
                  <Switch checked={generalSettings.allow_discount_without_approval} onCheckedChange={(v) => updateGeneral("allow_discount_without_approval", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "تفعيل البقشيش" : "Enable Tips"}</Label>
                  <Switch checked={generalSettings.enable_tips} onCheckedChange={(v) => updateGeneral("enable_tips", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "تفعيل رسوم التوصيل" : "Enable Delivery Fee"}</Label>
                  <Switch checked={generalSettings.enable_delivery_fee} onCheckedChange={(v) => updateGeneral("enable_delivery_fee", v)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "إعدادات العرض" : "Display Settings"}</CardTitle>
              <CardDescription>{isRTL ? "التحكم في ما يظهر على شاشة نقطة البيع" : "Control what appears on the POS screen"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "عرض صور المنتجات" : "Show Product Images"}</Label>
                  <Switch checked={generalSettings.show_product_image} onCheckedChange={(v) => updateGeneral("show_product_image", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "عرض رمز المنتج (SKU)" : "Show Product SKU"}</Label>
                  <Switch checked={generalSettings.show_product_sku} onCheckedChange={(v) => updateGeneral("show_product_sku", v)} />
                </div>
              </div>
              <div>
                <Label>{isRTL ? "مدة تسجيل الخروج التلقائي (دقائق، 0 = معطل)" : "Auto Logout Minutes (0 = disabled)"}</Label>
                <Input type="number" value={generalSettings.auto_logout_minutes} onChange={(e) => updateGeneral("auto_logout_minutes", Number(e.target.value))} min={0} className="max-w-[200px]" />
              </div>
            </CardContent>
          </Card>

          {/* Sound Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "إعدادات الصوت" : "Sound Settings"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "صوت عند مسح الباركود" : "Sound on Barcode Scan"}</Label>
                  <Switch checked={generalSettings.sound_on_scan} onCheckedChange={(v) => updateGeneral("sound_on_scan", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "صوت عند إتمام الدفع" : "Sound on Payment"}</Label>
                  <Switch checked={generalSettings.sound_on_payment} onCheckedChange={(v) => updateGeneral("sound_on_payment", v)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isRTL ? "إعدادات الإيصال" : "Receipt Settings"}</CardTitle>
              <CardDescription>{isRTL ? "تخصيص محتوى وشكل الإيصال المطبوع" : "Customize printed receipt content and layout"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "عرض الشعار" : "Show Logo"}</Label>
                  <Switch checked={generalSettings.receipt_show_logo} onCheckedChange={(v) => updateGeneral("receipt_show_logo", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "عرض تفاصيل الضريبة" : "Show Tax Details"}</Label>
                  <Switch checked={generalSettings.receipt_show_tax_details} onCheckedChange={(v) => updateGeneral("receipt_show_tax_details", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">{isRTL ? "عرض باركود" : "Show Barcode"}</Label>
                  <Switch checked={generalSettings.receipt_show_barcode} onCheckedChange={(v) => updateGeneral("receipt_show_barcode", v)} />
                </div>
              </div>
              <div>
                <Label>{isRTL ? "رأس الإيصال" : "Receipt Header"}</Label>
                <Textarea value={generalSettings.receipt_header} onChange={(e) => updateGeneral("receipt_header", e.target.value)} placeholder={isRTL ? "نص يظهر أعلى الإيصال..." : "Text shown at top of receipt..."} rows={2} />
              </div>
              <div>
                <Label>{isRTL ? "تذييل الإيصال" : "Receipt Footer"}</Label>
                <Textarea value={generalSettings.receipt_footer} onChange={(e) => updateGeneral("receipt_footer", e.target.value)} placeholder={isRTL ? "شكراً لزيارتكم..." : "Thank you for visiting..."} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveGeneral} disabled={!generalDirty} className="gap-2">
              <Save className="h-4 w-4" />
              {isRTL ? "حفظ الإعدادات" : "Save Settings"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Terminal Dialog */}
      <Dialog open={terminalDialog} onOpenChange={setTerminalDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editingTerminal ? (isRTL ? "تعديل نقطة بيع" : "Edit Terminal") : (isRTL ? "إضافة نقطة بيع" : "Add Terminal")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{isRTL ? "الاسم بالعربي" : "Name (Arabic)"}</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (English)"}</Label><Input value={form.name_en} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div>
              <Label>{isRTL ? "النوع" : "Type"}</Label>
              <Select value={form.terminal_type} onValueChange={(v) => setForm(f => ({ ...f, terminal_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">{isRTL ? "تجزئة" : "Retail"}</SelectItem>
                  <SelectItem value="restaurant">{isRTL ? "مطعم" : "Restaurant"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>{isRTL ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminalDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? "..." : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printer Dialog */}
      <Dialog open={printerDialog} onOpenChange={setPrinterDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"} className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPrinter ? (isRTL ? "تعديل طابعة" : "Edit Printer") : (isRTL ? "إضافة طابعة" : "Add Printer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>{isRTL ? "الاسم بالعربي" : "Name (Arabic)"}</Label><Input value={printerForm.name} onChange={(e) => setPrinterForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{isRTL ? "الاسم بالإنجليزي" : "Name (English)"}</Label><Input value={printerForm.name_en} onChange={(e) => setPrinterForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{isRTL ? "نوع الطابعة" : "Printer Type"}</Label>
                <Select value={printerForm.type} onValueChange={(v) => setPrinterForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal">{isRTL ? "حرارية" : "Thermal"}</SelectItem>
                    <SelectItem value="laser">{isRTL ? "ليزر" : "Laser"}</SelectItem>
                    <SelectItem value="dot_matrix">{isRTL ? "نقطية" : "Dot Matrix"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? "طريقة الاتصال" : "Connection"}</Label>
                <Select value={printerForm.connection} onValueChange={(v) => setPrinterForm(f => ({ ...f, connection: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">{isRTL ? "شبكة (IP)" : "Network (IP)"}</SelectItem>
                    <SelectItem value="usb">USB</SelectItem>
                    <SelectItem value="bluetooth">{isRTL ? "بلوتوث" : "Bluetooth"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {printerForm.connection === "network" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>{isRTL ? "عنوان IP" : "IP Address"}</Label><Input value={printerForm.ip_address} onChange={(e) => setPrinterForm(f => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.1.100" /></div>
                <div><Label>{isRTL ? "المنفذ" : "Port"}</Label><Input value={printerForm.port} onChange={(e) => setPrinterForm(f => ({ ...f, port: e.target.value }))} placeholder="9100" /></div>
              </div>
            )}

            <div>
              <Label>{isRTL ? "عرض الورق" : "Paper Width"}</Label>
              <Select value={printerForm.paper_width} onValueChange={(v) => setPrinterForm(f => ({ ...f, paper_width: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm</SelectItem>
                  <SelectItem value="80mm">80mm</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{isRTL ? "عدد النسخ" : "Copies"}</Label>
              <Input type="number" value={printerForm.copies} onChange={(e) => setPrinterForm(f => ({ ...f, copies: Number(e.target.value) }))} min={1} max={5} className="max-w-[120px]" />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">{isRTL ? "طباعة الإيصالات" : "Print Receipts"}</Label>
                <Switch checked={printerForm.print_receipt} onCheckedChange={(v) => setPrinterForm(f => ({ ...f, print_receipt: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">{isRTL ? "طباعة طلبات المطبخ" : "Print Kitchen Orders"}</Label>
                <Switch checked={printerForm.print_kitchen} onCheckedChange={(v) => setPrinterForm(f => ({ ...f, print_kitchen: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">{isRTL ? "طباعة تلقائية بعد الدفع" : "Auto Print After Payment"}</Label>
                <Switch checked={printerForm.auto_print} onCheckedChange={(v) => setPrinterForm(f => ({ ...f, auto_print: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">{isRTL ? "طابعة افتراضية" : "Default Printer"}</Label>
                <Switch checked={printerForm.is_default} onCheckedChange={(v) => setPrinterForm(f => ({ ...f, is_default: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">{isRTL ? "نشطة" : "Active"}</Label>
                <Switch checked={printerForm.is_active} onCheckedChange={(v) => setPrinterForm(f => ({ ...f, is_active: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrinterDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSavePrinter} disabled={!printerForm.name}>
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSSettings;
