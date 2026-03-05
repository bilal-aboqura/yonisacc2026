import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Branch {
  id: string;
  name: string;
  name_en: string | null;
  is_main: boolean | null;
}

interface BranchSelectorProps {
  companyId: string;
  value: string;
  onChange: (branchId: string) => void;
  disabled?: boolean;
}

const BranchSelector = ({ companyId, value, onChange, disabled }: BranchSelectorProps) => {
  const { isRTL } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [noBranches, setNoBranches] = useState(false);

  useEffect(() => {
    const fetchReadyBranches = async () => {
      // Get active branches
      const { data: activeBranches } = await supabase
        .from("branches")
        .select("id, name, name_en, is_main")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("is_main", { ascending: false });

      if (!activeBranches || activeBranches.length === 0) {
        setBranches([]);
        setNoBranches(true);
        return;
      }

      // Check which branches have account settings linked (both sales & purchases)
      const { data: settings } = await supabase
        .from("branch_account_settings")
        .select("branch_id, module_type")
        .eq("company_id", companyId);

      // A branch is "ready" if it has sales, purchases, AND inventory settings
      const branchModules = new Map<string, Set<string>>();
      (settings || []).forEach((s: any) => {
        if (!branchModules.has(s.branch_id)) branchModules.set(s.branch_id, new Set());
        branchModules.get(s.branch_id)!.add(s.module_type);
      });

      const readyBranches = activeBranches.filter(b => {
        const modules = branchModules.get(b.id);
        return modules && modules.has("sales") && modules.has("purchases") && modules.has("inventory");
      });

      setBranches(readyBranches);
      setNoBranches(readyBranches.length === 0);

      // Auto-select main branch if no selection
      if (readyBranches.length > 0 && !value) {
        const main = readyBranches.find(b => b.is_main) || readyBranches[0];
        onChange(main.id);
      }
    };
    if (companyId) fetchReadyBranches();
  }, [companyId]);

  if (noBranches) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {isRTL ? "الفرع *" : "Branch *"}
        </Label>
        <div className="flex items-center gap-2 p-2 rounded-md border border-destructive/50 bg-destructive/5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{isRTL ? "الفرع غير جاهز: الرجاء ربط الحسابات أولاً" : "Branch not ready: Please link accounts first"}</span>
        </div>
      </div>
    );
  }

  if (branches.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        {isRTL ? "الفرع *" : "Branch *"}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={isRTL ? "اختر الفرع" : "Select branch"} />
        </SelectTrigger>
        <SelectContent>
          {branches.map(branch => (
            <SelectItem key={branch.id} value={branch.id}>
              {isRTL ? branch.name : (branch.name_en || branch.name)}
              {branch.is_main ? (isRTL ? " (رئيسي)" : " (Main)") : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BranchSelector;
