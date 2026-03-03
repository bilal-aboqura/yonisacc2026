import { useRBAC } from "@/hooks/useRBAC";
import { useLanguage } from "@/hooks/useLanguage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

interface PermissionGuardProps {
  /** The RBAC permission code, e.g. "CREATE_JOURNAL" */
  permission?: string;
  /** Render children normally if allowed */
  children: React.ReactNode;
  /** How to handle unauthorized: "hide" removes element, "disable" shows but disabled */
  fallback?: "hide" | "disable";
  /** Custom tooltip text when disabled */
  tooltipText?: string;
  /** @deprecated Use `permission` instead */
  featureKey?: string;
}

const PermissionGuard = ({
  permission,
  children,
  fallback = "disable",
  tooltipText,
  featureKey,
}: PermissionGuardProps) => {
  const { can, isLoading } = useRBAC();
  const { isRTL } = useLanguage();

  // Backward compat: accept featureKey if permission not provided
  const code = permission || featureKey || "";

  // While loading, show children normally
  if (isLoading) return <>{children}</>;

  const allowed = can(code);

  if (allowed) return <>{children}</>;

  if (fallback === "hide") return null;

  const defaultTooltip = isRTL
    ? "ليس لديك صلاحية لهذا الإجراء"
    : "You don't have permission for this action";

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
