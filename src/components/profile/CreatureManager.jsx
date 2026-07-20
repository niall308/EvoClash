import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import CreatureRow from "@/components/profile/CreatureRow";
import CreatureForm from "@/components/profile/CreatureForm";

export default function CreatureManager() {
  const [creatures, setCreatures] = useState([]);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.Creature.list();
      setCreatures(list);
    })();
  }, []);

  const handleAdd = async (data) => {
    const created = await base44.entities.Creature.create(data);
    setCreatures((c) => [...c, created]);
  };

  const handleDelete = async (id) => {
    await base44.entities.Creature.delete(id);
    setCreatures((c) => c.filter((x) => x.id !== id));
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3">Manage Creatures</h2>
      <CreatureForm onAdd={handleAdd} />
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {creatures.map((c) => (
          <CreatureRow key={c.id} creature={c} onDelete={handleDelete} />
        ))}
        {creatures.length === 0 && <p className="text-white/40 text-sm">No creatures yet.</p>}
      </div>
    </div>
  );
}