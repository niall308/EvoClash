import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AUDIT_ACTION_LABELS, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";

function fmtDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// Simple admin activity feed for a creature: lists recent CreatureAuditLog rows.
export default function CreatureAuditFeed({ creatureId }) {
  const [logs, setLogs] = useState([]);

  const load = async () => {
    const list = await base44.entities.CreatureAuditLog.filter({ creatureId }, "-created_date", 20);
    setLogs(list);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatureId]);

  if (!logs.length) return null;
  return (
    <div className="mt-4">
      <h4 className="text-white/60 text-xs font-semibold mb-1">{CREATURE_IMAGES_I18N.activityFeed}</h4>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {logs.map((l) => (
          <div key={l.id} className="text-[11px] text-white/50 bg-white/5 rounded px-2 py-1">
            <span className="font-semibold text-white/70">{AUDIT_ACTION_LABELS[l.action] || l.action}</span>
            {l.userName && <span> · {l.userName}</span>}
            <span className="text-white/30"> · {fmtDate(l.created_date)}</span>
            {l.note && <div className="text-white/40">{l.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}