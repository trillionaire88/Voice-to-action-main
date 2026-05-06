/**
 * MobileSelect
 *
 * On mobile: opens a MobileBottomSheet with tappable list items.
 * On desktop: renders the standard Radix <Select> component.
 *
 * Props:
 *   value        — current selected value
 *   onValueChange — (value) => void
 *   options      — [{ value, label }]
 *   placeholder  — string
 *   className    — extra classes for the trigger button
 */

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileBottomSheet from "@/components/ui/MobileBottomSheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MobileSelect({ value, onValueChange, options = [], placeholder = "Select…", className }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.value === value);
  const label = selected?.label ?? placeholder;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex items-center justify-between w-full min-h-[44px] px-3 py-2 rounded-xl",
            "border border-slate-200 bg-white text-sm text-slate-900 shadow-sm",
            "active:bg-slate-50 transition-colors",
            className
          )}
        >
          <span className={cn(selected ? "text-slate-900" : "text-slate-400")}>{label}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        </button>
        <MobileBottomSheet open={open} onClose={() => setOpen(false)} title={placeholder}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onValueChange(opt.value); setOpen(false); }}
              className={cn(
                "flex items-center justify-between w-full min-h-[44px] px-4 py-3 text-sm text-left",
                "border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors",
                opt.value === value ? "text-blue-600 font-semibold" : "text-slate-800"
              )}
            >
              {opt.label}
              {opt.value === value && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            </button>
          ))}
        </MobileBottomSheet>
      </>
    );
  }

  // Desktop — standard Radix Select
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("min-h-[44px]", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}