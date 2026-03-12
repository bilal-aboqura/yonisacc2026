import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CreditCard, CheckCircle, XCircle, Loader2, ArrowLeft, Clock,
    Shield, Zap, Crown, Globe,
} from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";

// ── Kashier Iframe Component ───────────────────────────────────
interface KashierData {
    merchantId: string;
    orderId: string;
    amount: string;
    currency: string;
    hash: string;
    mode: string;
    merchantRedirect: string;
    serverWebhook: string;
    metaData?: string;
}

const KashierIframe = ({
    data,
    onClose,
    isRTL,
}: {
    data: KashierData;
    onClose: () => void;
    isRTL: boolean;
}) => {
    const iframeUrl = new URL("https://checkout.kashier.io");
    iframeUrl.searchParams.set("merchantId", data.merchantId);
    iframeUrl.searchParams.set("orderId", data.orderId);
    iframeUrl.searchParams.set("amount", data.amount);
    iframeUrl.searchParams.set("currency", data.currency);
    iframeUrl.searchParams.set("hash", data.hash);
    iframeUrl.searchParams.set("mode", data.mode);
    iframeUrl.searchParams.set("merchantRedirect", data.merchantRedirect);
    iframeUrl.searchParams.set("serverWebhook", data.serverWebhook);
    if (data.metaData) {
        iframeUrl.searchParams.set("metaData", data.metaData);
    }
    iframeUrl.searchParams.set("display", "en");

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">
                        {isRTL ? "إتمام الدفع" : "Complete Payment"}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <XCircle className="h-5 w-5" />
                    </Button>
                </div>
                <div className="w-full" style={{ height: "500px" }}>
                    <iframe
                        src={iframeUrl.toString()}
                        className="w-full h-full border-0"
                        title="Kashier Payment"
                        allow="payment"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                    />
                </div>
            </div>
        </div>
    );
};

// ── Main PaymentPage Component ─────────────────────────────────

const PaymentPage = () => {
    const { isRTL } = useLanguage();
    const { user } = useAuth();
    const { companyId } = useTenantIsolation();
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [kashierData, setKashierData] = useState<KashierData | null>(null);
    const [userCountry, setUserCountry] = useState<string>("");
    const [searchParams] = useSearchParams();

    // Detect callback status from URL
    const callbackStatus = searchParams.get("status");
    const callbackPaymentId = searchParams.get("payment_id");

    // Show toast on callback return
    useEffect(() => {
        if (callbackStatus === "success") {
            toast({
                title: isRTL ? "تم الدفع بنجاح" : "Payment Successful",
                description: isRTL
                    ? "تم تفعيل اشتراكك بنجاح"
                    : "Your subscription has been activated successfully",
            });
        } else if (callbackStatus === "failed") {
            toast({
                title: isRTL ? "فشل الدفع" : "Payment Failed",
                description: isRTL
                    ? "لم تتم عملية الدفع. يرجى المحاولة مرة أخرى"
                    : "Payment was not completed. Please try again",
                variant: "destructive",
            });
        }
    }, [callbackStatus, isRTL]);

    // Detect user country via IP geolocation
    useEffect(() => {
        const detectCountry = async () => {
            try {
                const res = await fetch("https://ipapi.co/json/", {
                    signal: AbortSignal.timeout(5000),
                });
                if (res.ok) {
                    const data = await res.json();
                    setUserCountry(data.country_code || "");
                    console.log("Detected country:", data.country_code);
                }
            } catch (e) {
                console.warn("Country detection failed, defaulting to PayTabs");
                setUserCountry("SA"); // default to SAR/PayTabs
            }
        };
        detectCountry();
    }, []);

    // Fetch current subscription
    const { data: currentSub, isLoading: loadingSub } = useQuery({
        queryKey: ["current-subscription", companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const { data, error } = await supabase
                .from("subscriptions")
                .select("*, plan:subscription_plans(id, name_ar, name_en, price, duration_months)")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!companyId,
    });

    // Fetch available plans
    const { data: plans, isLoading: loadingPlans } = useQuery({
        queryKey: ["payment-plans"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("is_active", true)
                .order("price", { ascending: true });
            if (error) throw error;
            return data;
        },
    });

    // Fetch payment history
    const { data: payments, isLoading: loadingPayments } = useQuery({
        queryKey: ["payment-history", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from("payments" as any)
                .select("*")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false })
                .limit(10);
            if (error) {
                console.error("Payments query error:", error);
                return [];
            }
            return (data as any[]) || [];
        },
        enabled: !!companyId,
    });

    // Create payment session
    const paymentMutation = useMutation({
        mutationFn: async (planId: string) => {
            const { data, error } = await supabase.functions.invoke("payment-create-session", {
                body: {
                    plan_id: planId,
                    company_id: companyId,
                    country: userCountry,
                    callback_url: window.location.origin + "/client/payment?callback=true",
                },
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            if (data?.gateway === "kashier" && data?.kashier_data) {
                // Egypt: show Kashier iframe
                setKashierData(data.kashier_data);
            } else if (data?.payment_url) {
                // PayTabs: redirect to hosted page
                window.location.href = data.payment_url;
            } else {
                toast({
                    title: isRTL ? "خطأ" : "Error",
                    description: isRTL ? "لم يتم إنشاء رابط الدفع" : "Payment URL not generated",
                    variant: "destructive",
                });
            }
        },
        onError: (err: any) => {
            toast({
                title: isRTL ? "خطأ في الدفع" : "Payment Error",
                description: err.message || (isRTL ? "حدث خطأ أثناء إنشاء جلسة الدفع" : "Failed to create payment session"),
                variant: "destructive",
            });
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-green-500/10 text-green-600 border-green-200";
            case "trialing": return "bg-blue-500/10 text-blue-600 border-blue-200";
            case "expired": case "past_due": return "bg-red-500/10 text-red-600 border-red-200";
            case "suspended": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
            default: return "bg-muted text-muted-foreground";
        }
    };

    const getPlanIcon = (idx: number) => {
        if (idx === 0) return <Zap className="h-6 w-6" />;
        if (idx === 1) return <Shield className="h-6 w-6" />;
        return <Crown className="h-6 w-6" />;
    };

    const getGatewayLabel = () => {
        if (userCountry === "EG") {
            return { name: isRTL ? "كاشير" : "Kashier", currency: "EGP", icon: "🇪🇬" };
        }
        return { name: isRTL ? "بيتابز" : "PayTabs", currency: "SAR", icon: "💳" };
    };

    if (!user || !companyId) {
        return (
            <div className="flex items-center justify-center p-12">
                <p className="text-muted-foreground">{isRTL ? "يرجى تسجيل الدخول" : "Please sign in"}</p>
            </div>
        );
    }

    const gatewayInfo = getGatewayLabel();

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Kashier Iframe Modal */}
            {kashierData && (
                <KashierIframe
                    data={kashierData}
                    isRTL={isRTL}
                    onClose={() => setKashierData(null)}
                />
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">{isRTL ? "الاشتراك والدفع" : "Subscription & Payment"}</h1>
                <p className="text-muted-foreground mt-1">
                    {isRTL ? "إدارة اشتراكك وطرق الدفع" : "Manage your subscription and payment methods"}
                </p>
                {/* Payment Gateway Info */}
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>
                        {isRTL ? "بوابة الدفع:" : "Payment gateway:"}{" "}
                        <span className="font-medium text-foreground">
                            {gatewayInfo.icon} {gatewayInfo.name}
                        </span>
                    </span>
                </div>
            </div>

            {/* Current Subscription Card */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">{isRTL ? "الاشتراك الحالي" : "Current Subscription"}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingSub ? (
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ) : currentSub ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{isRTL ? "الباقة" : "Plan"}</p>
                                <p className="font-semibold">{isRTL ? (currentSub as any).plan?.name_ar : (currentSub as any).plan?.name_en}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{isRTL ? "الحالة" : "Status"}</p>
                                <Badge className={getStatusColor(currentSub.status)}>
                                    {currentSub.status === "active" ? (isRTL ? "نشط" : "Active") :
                                        currentSub.status === "trialing" ? (isRTL ? "تجريبي" : "Trial") :
                                            currentSub.status === "expired" ? (isRTL ? "منتهي" : "Expired") :
                                                currentSub.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{isRTL ? "تاريخ الانتهاء" : "Expires"}</p>
                                <p className="font-semibold">
                                    {currentSub.end_date
                                        ? format(new Date(currentSub.end_date), "dd MMM yyyy", { locale: isRTL ? ar : enUS })
                                        : "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{isRTL ? "السعر" : "Price"}</p>
                                <p className="font-semibold">{(currentSub as any).plan?.price || 0} SAR</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">{isRTL ? "لا يوجد اشتراك حالي" : "No active subscription"}</p>
                    )}
                </CardContent>
            </Card>

            {/* Available Plans */}
            <div>
                <h2 className="text-xl font-bold mb-4">{isRTL ? "الباقات المتاحة" : "Available Plans"}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loadingPlans ? (
                        [...Array(3)].map((_, i) => (
                            <Card key={i} className="border-0 shadow-lg">
                                <CardContent className="p-6 space-y-4">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-8 w-24" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        plans?.map((plan: any, idx: number) => {
                            const isCurrentPlan = (currentSub as any)?.plan?.id === plan.id;
                            const isSelected = selectedPlanId === plan.id;
                            return (
                                <Card
                                    key={plan.id}
                                    className={`border-2 shadow-lg transition-all cursor-pointer hover:shadow-xl ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                                        } ${isCurrentPlan ? "bg-primary/5" : ""}`}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                >
                                    <CardHeader className="space-y-1 pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-xl ${idx === 0 ? "bg-blue-500/10 text-blue-600" : idx === 1 ? "bg-purple-500/10 text-purple-600" : "bg-amber-500/10 text-amber-600"}`}>
                                                    {getPlanIcon(idx)}
                                                </div>
                                                <CardTitle className="text-lg">{isRTL ? plan.name_ar : plan.name_en}</CardTitle>
                                            </div>
                                            {isCurrentPlan && (
                                                <Badge className="bg-green-500/10 text-green-600 text-xs">
                                                    {isRTL ? "الحالية" : "Current"}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <div className="flex items-baseline gap-1 mb-3">
                                            <span className="text-3xl font-bold">{plan.price}</span>
                                            <span className="text-muted-foreground text-sm">
                                                SAR / {plan.duration_months} {isRTL ? "شهر" : "months"}
                                            </span>
                                        </div>
                                        {plan.description && (
                                            <p className="text-sm text-muted-foreground">{isRTL ? plan.description_ar || plan.description : plan.description}</p>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            className="w-full gradient-primary text-primary-foreground"
                                            disabled={paymentMutation.isPending || (isCurrentPlan && currentSub?.status === "active")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                paymentMutation.mutate(plan.id);
                                            }}
                                        >
                                            {paymentMutation.isPending && selectedPlanId === plan.id ? (
                                                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                            ) : (
                                                <CreditCard className="h-4 w-4 me-2" />
                                            )}
                                            {isCurrentPlan && currentSub?.status === "active"
                                                ? (isRTL ? "الباقة الحالية" : "Current Plan")
                                                : isCurrentPlan
                                                    ? (isRTL ? "تجديد" : "Renew")
                                                    : (isRTL ? "اشترك الآن" : "Subscribe Now")}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Payment History */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">{isRTL ? "سجل المدفوعات" : "Payment History"}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingPayments ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : payments && payments.length > 0 ? (
                        <div className="space-y-3">
                            {payments.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        {p.status === "paid" ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : p.status === "failed" ? (
                                            <XCircle className="h-5 w-5 text-destructive" />
                                        ) : (
                                            <Clock className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">
                                                {p.description || `Payment #${p.id.slice(0, 8)}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                {format(new Date(p.created_at), "dd MMM yyyy HH:mm", { locale: isRTL ? ar : enUS })}
                                                {p.gateway && (
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                                                        {p.gateway === "kashier" ? "Kashier" : p.gateway === "paytabs" ? "PayTabs" : p.gateway}
                                                    </Badge>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold">{p.amount} {p.currency}</span>
                                        <Badge className={
                                            p.status === "paid" ? "bg-green-500/10 text-green-600" :
                                                p.status === "failed" ? "bg-red-500/10 text-red-600" :
                                                    "bg-muted text-muted-foreground"
                                        }>
                                            {p.status === "paid" ? (isRTL ? "مدفوع" : "Paid") :
                                                p.status === "failed" ? (isRTL ? "فشل" : "Failed") :
                                                    (isRTL ? "معلق" : "Pending")}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">
                            {isRTL ? "لا توجد مدفوعات سابقة" : "No payment history"}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentPage;
