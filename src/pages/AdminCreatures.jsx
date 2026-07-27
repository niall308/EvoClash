import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CreatureManager from "@/components/profile/CreatureManager";

export default function AdminCreatures() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-8">Manage Creatures</h1>
      <CreatureManager />
    </div>
  );
}