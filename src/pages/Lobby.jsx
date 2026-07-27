import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PlayerLobbySection from "@/components/humanbattle/PlayerLobbySection";

export default function Lobby() {
  return (
    <div className="text-white px-6 py-8">
      <Link to="/human-battle" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <PlayerLobbySection />
    </div>
  );
}