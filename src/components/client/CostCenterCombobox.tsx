import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, X } from "lucide-react";

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
}

interface CostCenterComboboxProps {
  costCenters: CostCenter[];
  value: string;
  onSelect: (value: string) => void;
  isRTL: boolean;
  placeholder?: string;
}

const CostCenterCombobox = ({
  costCenters, value, onSelect, isRTL, placeholder,
}: CostCenterComboboxProps) => {
  const [open, setOpen] = useState(false);
  const selected = costCenters.find((c) => c.id === value);

  if (costCenters.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-9 text-xs"
            size="sm"
          >
            <span className="truncate">
              {selected
                ? `${selected.code} - ${isRTL ? selected.name : (selected.name_en || selected.name)}`
                : (placeholder || (isRTL ? "مركز تكلفة..." : "Cost center..."))}
            </span>
            <ChevronsUpDown className="ms-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder={isRTL ? "بحث..." : "Search..."} />
            <CommandList>
              <CommandEmpty>{isRTL ? "لا توجد نتائج" : "No results"}</CommandEmpty>
              <CommandGroup>
                {costCenters.map((cc) => (
                  <CommandItem
                    key={cc.id}
                    value={`${cc.code} ${cc.name} ${cc.name_en || ""}`}
                    onSelect={() => { onSelect(cc.id); setOpen(false); }}
                  >
                    <Check className={`me-2 h-3 w-3 ${value === cc.id ? "opacity-100" : "opacity-0"}`} />
                    <span className="font-mono text-xs me-1">{cc.code}</span>
                    <span className="truncate text-xs">{isRTL ? cc.name : (cc.name_en || cc.name)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onSelect("")}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default CostCenterCombobox;
