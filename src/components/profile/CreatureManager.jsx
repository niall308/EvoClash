import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import CreatureRow from "@/components/profile/CreatureRow";
import CreatureForm from "@/components/profile/CreatureForm";
import DownloadAllImagesButton from "@/components/profile/DownloadAllImagesButton";
import { RefreshCw } from "lucide-react";

export default function CreatureManager() {
  const [creatures, setCreatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Creature.list();
        setCreatures(list);
      } catch (err) {
        alert("Failed to load creatures: " + (err?.message || err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAdd = async (data) => {
    const created = await base44.entities.Creature.create(data);
    setCreatures((c) => [...c, created]);
    return created;
  };

  const handleDelete = async (id) => {
    await base44.entities.Creature.delete(id);
    setCreatures((c) => c.filter((x) => x.id !== id));
  };

  const handleUpdate = async (id, data) => {
    const updated = await base44.entities.Creature.update(id, data);
    setCreatures((c) => c.map((x) => (x.id === id ? updated : x)));
    return updated;
  };

  const handleSyncUA = async () => {
    setSyncing(true);
    try {
      const { data } = await base44.functions.invoke("syncUniqueAttacks", {});
      alert(
        `Synced Unique Attacks:\n• ${data.cardsUpdated} player cards\n• ${data.aiDeckCardsUpdated} AI deck cards\n(from ${data.configuredCreatures} configured creatures)`
      );
    } catch (err) {
      alert("Sync failed: " + (err?.message || err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold">Manage Creatures</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncUA}
            disabled={syncing}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold bg-purple-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync UA to Cards"}
          </button>
          <DownloadAllImagesButton creatures={creatures} />
        </div>
      </div>
      <CreatureForm onAdd={handleAdd} />
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {creatures.map((c) => (
          <CreatureRow key={c.id} creature={c} onDelete={handleDelete} onUpdate={handleUpdate} />
        ))}
        {loading && <p className="text-white/40 text-sm">Loading creatures…</p>}
        {!loading && creatures.length === 0 && <p className="text-white/40 text-sm">No creatures yet.</p>}
      </div>
    </div>
  );
}