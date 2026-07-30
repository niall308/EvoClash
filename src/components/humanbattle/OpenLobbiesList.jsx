import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";
import RankEmblem from "@/components/rank/RankEmblem";
import LobbyPreviewModal from "@/components/humanbattle/LobbyPreviewModal";
import LobbyFilterBar from "@/components/humanbattle/LobbyFilterBar";
import { getRankByRP } from "@/lib/rankSystem";

// Publicly listed open offline lobbies anyone can browse and join.
export default function OpenLobbiesList() {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState(null);
  const [previewLobby, setPreviewLobby] = useState(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const pollRef = useRef(null);

  const refresh = () => base44.functions.invoke("getOpenLobbies", {}).then(({ data }) => setLobbies(data?.lobbies || []));

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const filteredLobbies = lobbies?.filter((l) => {
    const matchesSearch = l.hostName.toLowerCase().includes(search.trim().toLowerCase());
    const matchesTier = tierFilter === "all" || getRankByRP(l.rankPoints).name === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="mb-6">
      <p className="text-white/50 text-xs font-semibold mb-2">Open Lobbies</p>
      {lobbies?.length > 0 && (
        <LobbyFilterBar search={search} onSearchChange={setSearch} tierFilter={tierFilter} onTierFilterChange={setTierFilter} />
      )}
      {lobbies === null && <p className="text-white/50 text-sm">Loading lobbies...</p>}
      {lobbies?.length === 0 && <p className="text-white/40 text-sm">No open lobbies right now — create one!</p>}
      {lobbies?.length > 0 && filteredLobbies.length === 0 && (
        <p className="text-white/40 text-sm">No lobbies match your search.</p>
      )}
      <div className="space-y-2">
        {filteredLobbies?.map((l) => (
          <button
            key={l.id}
            onClick={() => setPreviewLobby(l)}
            className="w-full flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <RankEmblem rp={l.rankPoints} size="sm" />
              <div className="text-left">
                <p className="font-bold text-sm">{l.hostName}</p>
                <p className="text-white/40 text-xs">
                  <span className="text-emerald-400">{l.wins}W</span> — <span className="text-red-400">{l.losses}L</span>
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
              <Eye className="w-3.5 h-3.5" /> View
            </span>
          </button>
        ))}
      </div>

      {previewLobby && (
        <LobbyPreviewModal
          lobby={previewLobby}
          onClose={() => setPreviewLobby(null)}
          onJoined={(code) => navigate(`/pvp-battle/${code}`)}
        />
      )}
    </div>
  );
}