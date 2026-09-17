import React from "react";
import { Link } from "react-router-dom";
import { Egg, ArrowLeft } from "lucide-react";

export default function EggStore() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-white text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg mb-6">
        <Egg className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">Egg Store</h1>
      <p className="text-white/50 text-sm mb-8">Coming soon — eggs that hatch into creature cards are on the way!</p>
      <Link
        to="/"
        className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-6 py-3 font-bold active:scale-95 transition-transform"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>
    </div>
  );
}