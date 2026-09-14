import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import CreatureRow from "@/components/profile/CreatureRow";
import CreatureForm from "@/components/profile/CreatureForm";

// Admin Manage Creatures: add form + expandable rows. Each row expands into a
// CreatureEditor (Details / Images / Unique Attack tabs). The images + unique
// attack flows run through backend functions; description editing uses the
// entity SDK directly (admin-only RLS).
export default function CreatureManager() {
  const [creatures, setCreatures] = useState([]);

  const load = async () => {
    const list = await base44.entities.Creature.list();
    setCreatures(list);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (data) => {
    const created = await base44.entities.Creature.create(data);
    setCreatures((c) => [created, ...c]);
  };

  const handleDelete = async (id) => {
    await base44.entities.Creature.delete(id);
    setCreatures((c) => c.filter((x) => x.id !== id));
  };

  const handleUpdated = (updated) => {
    setCreatures((c) => c.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3">Manage Creatures</h2>
      <CreatureForm onAdd={handleAdd} />
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {creatures.map((c) => (
          <CreatureRow
            key={c.id}
            creature={c}
            onDelete={handleDelete}
            onUpdated={handleUpdated}
          />
        ))}
        {creatures.length === 0 && <p className="text-white/40 text-sm">No creatures yet.</p>}
      </div>
    </div>
  );
}