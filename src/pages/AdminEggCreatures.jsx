import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Egg, ChevronDown, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import EggCreatureRow from "@/components/admin/EggCreatureRow";

// Admin page for configuring which creatures can hatch from eggs and what they
// look like. Lists every creature in the game and lets the admin set baby +
// upgraded card art (multiple images each) and the baby/upgraded display names.
export default function AdminEggCreatures() {
  const [creatures, setCreatures] = useState(null);
  const [selected, setSelected] = useState([]); // creature ids to show; empty = all

  useEffect(() => {
    (async () => {
      const list = await base44.entities.Creature.filter({}, undefined, 1000);
      list.sort(
        (a, b) =>
          (a.category || "").localeCompare(b.category || "") ||
          (a.baseName || "").localeCompare(b.baseName || "")
      );
      setCreatures(list);
    })();
  }, []);

  const visible = useMemo(
    () => (creatures || []).filter((c) => selected.length === 0 || selected.includes(c.id)),
    [creatures, selected]
  );

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="text-white px-6 py-6 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
        <Egg className="w-6 h-6 text-amber-400" /> Egg Creatures
      </h1>
      <p className="text-white/50 text-xs mb-6">
        Configure the baby &amp; upgraded (Good/Evil) card art and names for creatures that can hatch from eggs. A creature needs at least one baby image to be eligible. On upgrade, a hatchling has a 50/50 chance of becoming Good or Evil.
      </p>

      {creatures && (
        <div className="mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-white/5 border-white/15 text-white hover:bg-white/10">
                <span className="truncate">
                  {selected.length === 0 ? "All creatures" : `${selected.length} selected`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[60vh] overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)] min-w-[16rem] bg-[#0D1B2A] border-white/15">
              <DropdownMenuItem
                onSelect={() => setSelected([])}
                className="text-white/80 focus:bg-white/10 cursor-pointer"
              >
                <Check className={`w-4 h-4 mr-2 ${selected.length === 0 ? "opacity-100" : "opacity-0"}`} />
                All creatures
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              {creatures.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onSelect={(e) => { e.preventDefault(); toggle(c.id); }}
                  className="text-white/80 focus:bg-white/10 cursor-pointer"
                >
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} className="mr-2 pointer-events-none" />
                  <span className="truncate">{c.baseName}</span>
                  <span className="ml-auto text-[10px] text-white/40">{c.category}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {!creatures ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="space-y-3">
          {visible.length === 0 ? (
            <p className="text-center text-white/40 text-sm py-8">No creatures match this filter.</p>
          ) : (
            visible.map((c) => (
              <EggCreatureRow
                key={c.id}
                creature={c}
                onUpdate={(u) => setCreatures((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}