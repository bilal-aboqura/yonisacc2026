import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, Shield, Link2, FileText, Download, RefreshCw, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ZATCA_STATUS_MAP, type ZatcaStatus } from "@/lib/zatcaUtils";

interface ZatcaSettingsData {
  id: string;
  company_id: string;
  is_enabled: boolean;
  environment: string;
  icv_counter: number;
  seller_name: string | null;
  vat_number: string | null;
  building_number: string | null;
  street: string | null;
  district: string | null;
  city: string | null;
  postal_code: string | null;
  last_invoice_hash: string | null;
}

interface ZatcaLogEntry {
  id: string;
  uuid: string;
  icv: number;
  submission_status: string;
  invoice_type: string;
  submitted_at: string | null;
  xml_content: string | null;
  invoice: { invoice_number: string; total: number; type: string } | null;
}

interface RetryQueueEntry {
  id: string;
  invoice_id: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  last_error: string | null;
  status: string;
  created_at: string;
}

const ZatcaSettings = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { companyId } = useCompanyId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [settings, setSettings] = useState<ZatcaSettingsData | null>(null);
  const [logs, setLogs] = useState<ZatcaLogEntry[]>([]);
  const [retryQueue, setRetryQueue] = useState<RetryQueueEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, cleared: 0, reported: 0, rejected: 0, pending: 0 });

  // Form state
  const [sellerName, setSellerName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (companyId) fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      const { data: settingsData } = await (supabase as any)
        .from("zatca_settings")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();

      if (settingsData) {
        setSettings(settingsData);
        setSellerName(settingsData.seller_name || "");
        setVatNumber(settingsData.vat_number || "");
        setBuildingNumber(settingsData.building_number || "");
        setStreet(settingsData.street || "");
        setDistrict(settingsData.district || "");
        setCity(settingsData.city || "");
        setPostalCode(settingsData.postal_code || "");
        setEnvironment(settingsData.environment || "sandbox");
      } else {
        const { data: company } = await supabase
          .from("companies")
          .select("name, tax_number, address")
          .eq("id", companyId!)
          .single();
        if (company) {
          setSellerName(company.name || "");
          setVatNumber(company.tax_number || "");
        }
      }

      // Fetch logs
      const { data: logsData } = await (supabase as any)
        .from("zatca_invoice_logs")
        .select("*, invoice:invoices(invoice_number, total, type)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(20);
      setLogs(logsData || []);

      // Calculate stats
      const allLogs = logsData || [];
      setStats({
        total: allLogs.length,
        cleared: allLogs.filter((l: any) => l.submission_status === "cleared").length,
        reported: allLogs.filter((l: any) => l.submission_status === "reported").length,
        rejected: allLogs.filter((l: any) => l.submission_status === "rejected").length,
        pending: allLogs.filter((l: any) => l.submission_status === "pending").length,
      });

      // Fetch retry queue
      const { data: retryData } = await (supabase as any)
        .from("zatca_retry_queue")
        .select("*")
        .eq("company_id", companyId!)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false });
      setRetryQueue(retryData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSellerInfo = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const data = {
        seller_name: sellerName,
        vat_number: vatNumber,
        building_number: buildingNumber,
        street,
        district,
        city,
        postal_code: postalCode,
        updated_at: new Date().toISOString(),
      };

      if (settings) {
        await (supabase as any).from("zatca_settings").update(data).eq("company_id", companyId);
      } else {
        await (supabase as any).from("zatca_settings").insert({ ...data, company_id: companyId });
      }

      toast.success(isRTL ? "تم حفظ بيانات البائع" : "Seller info saved");
      fetchData();
    } catch {
      toast.error(isRTL ? "فشل في الحفظ" : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleOnboard = async () => {
    if (!companyId || !otp) {
      toast.error(isRTL ? "يرجى إدخال رمز OTP" : "Please enter OTP");
      return;
    }
    setOnboarding(true);
    try {
      const { data, error } = await supabase.functions.invoke("zatca-onboard", {
        body: { company_id: companyId, otp, environment },
      });
      if (error) throw error;
      toast.success(data?.message || (isRTL ? "تم الربط بنجاح" : "Connected successfully"));
      setOtp("");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? "فشل في الربط" : "Connection failed"));
    } finally {
      setOnboarding(false);
    }
  };

  const handleRetryManual = async (retryId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("zatca-retry", {});
      if (error) throw error;
      toast.success(isRTL ? "تم إعادة المحاولة" : "Retry processed");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? "فشل في إعادة المحاولة" : "Retry failed"));
    }
  };

  const downloadXML = (log: ZatcaLogEntry) => {
    if (!log.xml_content) {
      toast.error(isRTL ? "لا يوجد محتوى XML" : "No XML content");
      return;
    }
    const blob = new Blob([log.xml_content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${log.uuid?.substring(0, 8)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = settings?.is_enabled;
  const currentEnv = settings?.environment;

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isRTL ? "الفوترة الإلكترونية (ZATCA)" : "E-Invoicing (ZATCA)"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إعدادات الربط مع هيئة الزكاة والضريبة والجمارك - المرحلة الثانية" : "ZATCA Phase 2 Integration Settings"}
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: isRTL ? "إجمالي المرسلة" : "Total Submitted", value: stats.total, color: "text-foreground" },
          { label: isRTL ? "معتمدة (Cleared)" : "Cleared", value: stats.cleared, color: "text-emerald-600" },
          { label: isRTL ? "مُبلغ عنها (Reported)" : "Reported", value: stats.reported, color: "text-blue-600" },
          { label: isRTL ? "مرفوضة (Rejected)" : "Rejected", value: stats.rejected, color: "text-destructive" },
          { label: isRTL ? "قيد الانتظار" : "Pending", value: stats.pending, color: "text-amber-600" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isRTL ? "حالة الربط" : "Connection Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-primary">
                    {isRTL ? "مربوط" : "Connected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? `البيئة: ${currentEnv === "production" ? "إنتاج" : "اختبار"}` : `Environment: ${currentEnv}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? `عداد الفواتير (ICV): ${settings?.icv_counter || 0}` : `Invoice Counter (ICV): ${settings?.icv_counter || 0}`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{isRTL ? "غير مربوط" : "Not Connected"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "يرجى إدخال بيانات البائع ثم الربط مع الهيئة" : "Please enter seller info and connect with ZATCA"}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seller Information */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "بيانات البائع" : "Seller Information"}</CardTitle>
          <CardDescription>
            {isRTL ? "بيانات البائع المطلوبة للفوترة الإلكترونية" : "Seller details required for e-invoicing"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "اسم البائع" : "Seller Name"}</Label>
              <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الرقم الضريبي" : "VAT Number"}</Label>
              <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} dir="ltr" placeholder="3XXXXXXXXXXXXXXX" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "رقم المبنى" : "Building Number"}</Label>
              <Input value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الشارع" : "Street"}</Label>
              <Input value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الحي" : "District"}</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "المدينة" : "City"}</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الرمز البريدي" : "Postal Code"}</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} dir="ltr" />
            </div>
          </div>
          <Button onClick={saveSellerInfo} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {isRTL ? "حفظ بيانات البائع" : "Save Seller Info"}
          </Button>
        </CardContent>
      </Card>

      {/* Onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {isRTL ? "الربط مع الهيئة" : "Connect with ZATCA"}
          </CardTitle>
          <CardDescription>
            {isRTL ? "إدخال رمز OTP من بوابة فاتورة للربط" : "Enter OTP from Fatoora portal to connect"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "البيئة" : "Environment"}</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">{isRTL ? "بيئة اختبار (Sandbox)" : "Sandbox"}</SelectItem>
                  <SelectItem value="production">{isRTL ? "بيئة إنتاج (Production)" : "Production"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "رمز OTP" : "OTP Code"}</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" dir="ltr" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleOnboard} disabled={onboarding || !otp} className="w-full">
                {onboarding && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {isRTL ? "ربط مع الهيئة" : "Connect"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retry Queue */}
      {retryQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              {isRTL ? "طابور إعادة الإرسال" : "Retry Queue"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "الفواتير التي فشل إرسالها وتنتظر إعادة المحاولة" : "Failed invoices awaiting retry"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الفاتورة" : "Invoice"}</TableHead>
                  <TableHead>{isRTL ? "المحاولات" : "Retries"}</TableHead>
                  <TableHead>{isRTL ? "المحاولة التالية" : "Next Retry"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراء" : "Action"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retryQueue.map((retry) => (
                  <TableRow key={retry.id}>
                    <TableCell className="font-mono text-sm">{retry.invoice_id.substring(0, 8)}...</TableCell>
                    <TableCell>{retry.retry_count}/{retry.max_retries}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(retry.next_retry_at).toLocaleString(isRTL ? "ar-SA" : "en-US")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={retry.status === "processing" ? "default" : "secondary"}>
                        {retry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleRetryManual(retry.id)}>
                        <RefreshCw className="h-3 w-3 me-1" />
                        {isRTL ? "إعادة" : "Retry"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Submission Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? "سجل الإرسال" : "Submission Log"}
          </CardTitle>
          <CardDescription>
            {isRTL ? "آخر الفواتير المرسلة للهيئة" : "Recent invoices submitted to ZATCA"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {isRTL ? "لا توجد فواتير مرسلة بعد" : "No invoices submitted yet"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                    <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                    <TableHead>UUID</TableHead>
                    <TableHead>ICV</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "تاريخ الإرسال" : "Submitted"}</TableHead>
                    <TableHead>XML</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const statusInfo = ZATCA_STATUS_MAP[log.submission_status as ZatcaStatus] || ZATCA_STATUS_MAP.pending;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {log.invoice?.invoice_number || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.invoice_type === "standard" 
                              ? (isRTL ? "قياسية B2B" : "Standard B2B")
                              : (isRTL ? "مبسطة B2C" : "Simplified B2C")
                            }
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate" title={log.uuid}>
                          {log.uuid?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{log.icv}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.color}>
                            {isRTL ? statusInfo.ar : statusInfo.en}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.submitted_at 
                            ? new Date(log.submitted_at).toLocaleDateString(isRTL ? "ar-SA" : "en-US")
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          {log.xml_content && (
                            <Button size="sm" variant="ghost" onClick={() => downloadXML(log)}>
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ZatcaSettings;
