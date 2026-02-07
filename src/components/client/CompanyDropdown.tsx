import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, LogOut, Calendar, CreditCard, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const CompanyDropdown = () => {
  const { user, signOut } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  // Fetch company data
  const { data: company } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Error fetching company:", error);
        return null;
      }
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

  // Fetch subscription data
  const { data: subscription } = useQuery({
    queryKey: ["user-subscription", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }
      return data;
    },
    enabled: !!company?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd MMM yyyy", { locale: isRTL ? ar : enUS });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "expired":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      active: { ar: "نشط", en: "Active" },
      pending: { ar: "قيد الانتظار", en: "Pending" },
      expired: { ar: "منتهي", en: "Expired" },
      cancelled: { ar: "ملغي", en: "Cancelled" },
    };
    return isRTL ? labels[status]?.ar || status : labels[status]?.en || status;
  };

  const companyInitials = company?.name
    ? company.name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "gap-2 px-2 h-10 hover:bg-accent",
            isRTL && "flex-row-reverse"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={company?.logo_url || ""} alt={company?.name || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {companyInitials}
            </AvatarFallback>
          </Avatar>
          <div className={cn("hidden sm:flex flex-col items-start text-start", isRTL && "items-end text-end")}>
            <span className="text-sm font-medium truncate max-w-[120px]">
              {company?.name || (isRTL ? "شركتي" : "My Company")}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {user?.email}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isRTL ? "start" : "end"} 
        className="w-72"
      >
        {/* Company Info Header */}
        <DropdownMenuLabel className="font-normal">
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={company?.logo_url || ""} alt={company?.name || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {companyInitials}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex flex-col", isRTL && "items-end")}>
              <span className="font-semibold">
                {company?.name || (isRTL ? "شركتي" : "My Company")}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Subscription Info */}
        {subscription && (
          <>
            <div className="px-2 py-3 space-y-3">
              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isRTL ? "الباقة" : "Plan"}
                  </span>
                </div>
                <Badge variant="outline" className="font-medium">
                  {isRTL ? subscription.plan?.name_ar : subscription.plan?.name_en}
                </Badge>
              </div>

              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isRTL ? "الحالة" : "Status"}
                  </span>
                </div>
                <Badge variant="outline" className={cn("font-medium", getStatusColor(subscription.status))}>
                  {getStatusLabel(subscription.status)}
                </Badge>
              </div>

              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isRTL ? "تاريخ البداية" : "Start Date"}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {formatDate(subscription.start_date)}
                </span>
              </div>

              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isRTL ? "تاريخ الانتهاء" : "End Date"}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {formatDate(subscription.end_date)}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator />
          </>
        )}

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className={cn(
            "text-destructive focus:text-destructive cursor-pointer",
            isRTL && "flex-row-reverse"
          )}
        >
          <LogOut className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
          {isRTL ? "تسجيل الخروج" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CompanyDropdown;
