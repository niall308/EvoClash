import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, UserPlus } from "lucide-react";

export default function HumanBattle() {
  return (
    <div className="text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4 min-h-[44px] px-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-3xl font-black mb-6">Battle vs Human</h1>

      <div className="space-y-4">
        <Link to="/lobby" className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-600 to-cyan-500 p-5 rounded-2xl font-bold text-left">
          <Users className="w-8 h-8" /> Player Lobby
        </Link>
        <Link to="/friends" className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-500 to-yellow-600 p-5 rounded-2xl font-bold text-left">
          <UserPlus className="w-8 h-8" /> Friends
        </Link>
      </div>
    </div>
  );
}