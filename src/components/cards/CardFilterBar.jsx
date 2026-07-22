import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TYPES } from "@/lib/gameConstants";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

function FilterButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-white/10">
      {label} <ChevronDown className="w-3.5 h-3.5" />
    </button>
  );
}

function OptionList({ options, value, onSelect }) {
  return (
    <div className="px-4 pb-8 space-y-1 max-h-[60vh] overflow-y-auto">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold ${
            value === o.value ? "bg-amber-500 text-black" : "bg-white/5 text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function CardFilterBar({ type, onTypeChange, tier, onTierChange, hybridOnly, onHybridToggle }) {
  const [openDrawer, setOpenDrawer] = useState(null); // 'type' | 'tier' | null

  const typeOptions = [{ value: "all", label: "All Types" }, ...TYPES.map((t) => ({ value: t, label: t }))];
  const tierOptions = [{ value: "all", label: "All Tiers" }, ...[1, 2, 3, 4].map((t) => ({ value: String(t), label: `Tier ${t}` }))];

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
      <FilterButton label={typeOptions.find((o) => o.value === type)?.label || "All Types"} onClick={() => setOpenDrawer("type")} />
      <FilterButton label={tierOptions.find((o) => o.value === tier)?.label || "All Tiers"} onClick={() => setOpenDrawer("tier")} />
      <button
        onClick={() => onHybridToggle(!hybridOnly)}
        className={`text-xs font-bold rounded-lg px-3 py-2 border ${
          hybridOnly ? "bg-amber-500 border-amber-500 text-black" : "bg-slate-800 border-white/10 text-white/70"
        }`}
      >
        Hybrid Only
      </button>

      <Drawer open={openDrawer === "type"} onOpenChange={(o) => !o && setOpenDrawer(null)}>
        <DrawerContent className="bg-[#0D1B2A] border-white/10 text-white">
          <DrawerHeader>
            <DrawerTitle className="text-white">Filter by Type</DrawerTitle>
          </DrawerHeader>
          <OptionList options={typeOptions} value={type} onSelect={(v) => { onTypeChange(v); setOpenDrawer(null); }} />
        </DrawerContent>
      </Drawer>

      <Drawer open={openDrawer === "tier"} onOpenChange={(o) => !o && setOpenDrawer(null)}>
        <DrawerContent className="bg-[#0D1B2A] border-white/10 text-white">
          <DrawerHeader>
            <DrawerTitle className="text-white">Filter by Tier</DrawerTitle>
          </DrawerHeader>
          <OptionList options={tierOptions} value={tier} onSelect={(v) => { onTierChange(v); setOpenDrawer(null); }} />
        </DrawerContent>
      </Drawer>
    </div>
  );
}