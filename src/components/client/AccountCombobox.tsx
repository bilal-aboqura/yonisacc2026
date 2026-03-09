import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  name_en?: string | null;
}

interface AccountComboboxProps {
  accounts: AccountOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  isRTL?: boolean;
  placeholder?: string;
  noneLabel?: string;
  showNone?: boolean;
  disabled?: boolean;
}

const AccountCombobox = ({
  accounts,
  value,
  onChange,
  isRTL = false,
  placeholder,
  noneLabel,
  showNone = true,
  disabled = false,
}: AccountComboboxProps) => {
  const [open, setOpen] = useState(false);

  const selected = accounts.find((a) => a.id === value);
  const displayText = selected
    ? `${selected.code} - ${isRTL ? selected.name : selected.name_en || selected.name}`
    : noneLabel || (isRTL ? "-- بدون --" : "-- None --");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value ? displayText : (placeholder || (isRTL ? "اختر الحساب" : "Select Account"))}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={isRTL ? "ابحث بالاسم أو الرمز..." : "Search by name or code..."} />
          <CommandList>
            <CommandEmpty>{isRTL ? "لا توجد نتائج" : "No results found"}</CommandEmpty>
            <CommandGroup>
              {showNone && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  {noneLabel || (isRTL ? "-- بدون --" : "-- None --")}
                </CommandItem>
              )}
              {accounts.map((acc) => (
                <CommandItem
                  key={acc.id}
                  value={`${acc.code} ${acc.name} ${acc.name_en || ""}`}
                  onSelect={() => {
                    onChange(acc.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === acc.id ? "opacity-100" : "opacity-0")} />
                  {acc.code} - {isRTL ? acc.name : acc.name_en || acc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AccountCombobox;
