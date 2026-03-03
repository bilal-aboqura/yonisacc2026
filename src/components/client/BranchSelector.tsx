import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

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

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, name_en, is_main")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("is_main", { ascending: false });

      setBranches(data || []);

      // Auto-select main branch if only one branch or no selection
      if (data && data.length > 0 && !value) {
        const main = data.find(b => b.is_main) || data[0];
        onChange(main.id);
      }
    };
    if (companyId) fetch();
  }, [companyId]);

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
