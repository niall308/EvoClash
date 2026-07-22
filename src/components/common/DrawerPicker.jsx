import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export default function DrawerPicker({ label, options, value, onSelect, disabled, triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-white disabled:opacity-60 ${triggerClassName}`}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#0D1B2A] border-white/10 text-white">
          <DrawerHeader>
            <DrawerTitle className="text-white">{label}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-1 max-h-[60vh] overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold ${
                  value === o.value ? "bg-amber-500 text-black" : "bg-white/5 text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}