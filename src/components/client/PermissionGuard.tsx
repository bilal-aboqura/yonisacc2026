import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/hooks/useLanguage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionGuardProps {
  /** The feature key to check, e.g. "sales.create_invoice" */
  featureKey: string;
  /** Render children normally if allowed */
  children: React.ReactNode;
  /** How to handle unauthorized: "hide" removes element, "disable" shows but disabled */
  fallback?: "hide" | "disable";
  /** Custom tooltip text when disabled */
  tooltipText?: string;
}

const PermissionGuard = ({
  featureKey,
  children,
  fallback = "disable",
  tooltipText,
}: PermissionGuardProps) => {
  const { hasPermission, isLoading } = usePermissions();
  const { isRTL } = useLanguage();

  // While loading, show children normally
  if (isLoading) return <>{children}</>;

  const allowed = hasPermission(featureKey);

  if (allowed) return <>{children}</>;

  if (fallback === "hide") return null;

  // Disable mode: wrap in tooltip with lock overlay
  const defaultTooltip = isRTL
    ? "غير متاح في خطتك الحالية"
    : "Not available in your current plan";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative inline-flex">
          <div className="pointer-events-none opacity-50 select-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 rounded cursor-not-allowed">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltipText || defaultTooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default PermissionGuard;
