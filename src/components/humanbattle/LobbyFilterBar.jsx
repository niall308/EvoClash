import React, { useMemo } from "react";
import { Search } from "lucide-react";
import { RANKS } from "@/lib/rankSystem";
import DrawerPicker from "@/components/common/DrawerPicker";

export default function LobbyFilterBar({ search, onSearchChange, tierFilter, onTierFilterChange }) {
  const tierOptions = useMemo(
    () => [{ value: "all", label: "All Tiers" }, ...RANKS.map((r) => ({ value: r.name, label: r.name }))],
    []
  );
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by host name..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50"
        />
      </div>
      <DrawerPicker
        label="Filter by Tier"
        options={tierOptions}
        value={tierFilter}
        onSelect={onTierFilterChange}
        triggerClassName="bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-amber-400/50 shrink-0"
      />
    </div>
  );
}