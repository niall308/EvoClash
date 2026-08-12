import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Volume2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { SOUND_KEYS } from "@/lib/soundConstants";
import SoundRow from "@/components/admin/SoundRow";

const GROUPS = [
  { cat: "menu", title: "Menu Music" },
  { cat: "ingame", title: "In-Game Music" },
  { cat: "action", title: "Action Sounds" },
];

export default function AdminSounds() {
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState({});
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    const list = await base44.entities.SoundAsset.list(undefined, 100);
    setAssets(Object.fromEntries(list.map((a) => [a.key, a])));
  };

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (u?.role === "admin") await reload();
      setLoaded(true);
    })();
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }
  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="text-white px-6 py-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
        <Volume2 className="w-6 h-6 text-amber-400" /> Sound Manager
      </h1>
      <p className="text-white/50 text-xs mb-6">
        Upload an audio file for each sound. Toggle Loop for background music that should play continuously.
      </p>
      {GROUPS.map((g) => (
        <div key={g.cat} className="mb-6">
          <h2 className="text-sm font-bold text-amber-400 mb-2">{g.title}</h2>
          <div className="space-y-2">
            {SOUND_KEYS.filter((s) => s.category === g.cat).map((s) => (
              <SoundRow key={s.key} sound={s} asset={assets[s.key]} onChanged={reload} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}