import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Egg as EggIcon, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";

const EGG_IMG = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/78ba2e7fa_Egg-design.png";
const BUY_COST = 500000;
const MAX_EGGS = 5;

export default function EggStore() {
  const { toast } = useToast();
  const [eggCount, setEggCount] = useState(null);
  const [coins, setCoins] = useState(null);
  const [buying, setBuying] = useState(false);

  const load = async () => {
    const me = await base44.auth.me();
    setCoins(me.coins || 0);
    const eggs = await base44.entities.Egg.filter({});
    setEggCount(eggs.length);
  };

  useEffect(() => {
    load();
  }, []);

  const handleBuy = async () => {
    if (buying) return;
    setBuying(true);
    try {
      const res = await base44.functions.invoke("buyEgg", {});
      toast({ title: "Egg purchased!", description: "Find it under Creature Eggs in your Deck." });
      setCoins(res.data.user.coins);
      setEggCount((c) => (c ?? 0) + 1);
    } catch (e) {
      toast({ title: "Could not buy egg", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setBuying(false);
    }
  };

  const canAfford = (coins ?? 0) >= BUY_COST;
  const atCap = (eggCount ?? 0) >= MAX_EGGS;
  const disabled = buying || atCap || !canAfford;

  return (
    <div className="flex flex-col items-center px-6 py-8 text-white min-h-[80vh]">
      <div className="w-full flex items-center mb-4">
        <Link to="/" className="flex items-center gap-1 text-white/60 text-sm active:scale-95">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
      </div>

      <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">Egg Store</h1>
      <p className="text-white/50 text-xs mb-6 text-center">Buy a creature egg and incubate it over 30 days.</p>

      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1A1A1E] to-[#0D1B2A] border border-white/10 p-5 shadow-2xl">
        <div className="rounded-2xl overflow-hidden mb-4 bg-black/40">
          <Image src={EGG_IMG} alt="Mystic creature egg on a runed stone pedestal" fittingType="fit" className="w-full h-52" />
        </div>
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-amber-300">Mystic Creature Egg</p>
          <p className="text-xs text-white/50">{eggCount === null ? "…" : `${eggCount} / ${MAX_EGGS} owned`}</p>
        </div>
        <p className="text-white/50 text-[11px] mb-4">Hatches into a baby Tier 3 creature after 30 days of care (250 LC / day).</p>

        <button
          onClick={handleBuy}
          disabled={disabled}
          className={`w-full py-3 rounded-full font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 ${
            disabled ? "bg-white/10 text-white/40" : "bg-gradient-to-r from-amber-500 to-yellow-400 text-black"
          }`}
        >
          {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <EggIcon className="w-4 h-4" />}
          {atCap ? "Egg limit reached (5)" : `Buy - ${BUY_COST.toLocaleString()} LC`}
        </button>
        {!canAfford && !atCap && <p className="text-red-400 text-[11px] text-center mt-2">Not enough LC</p>}

        <Link to="/deck" className="block text-center text-amber-400 text-xs font-bold mt-3 active:scale-95">
          View your eggs in the Deck →
        </Link>
      </div>
    </div>
  );
}