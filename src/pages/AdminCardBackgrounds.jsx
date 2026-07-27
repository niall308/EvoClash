import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CardBackgroundManager from "@/components/admin/CardBackgroundManager";

export default function AdminCardBackgrounds() {
  return (
    <div className="text-white px-6 py-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-2">Card Backgrounds</h1>
      <p className="text-white/50 text-sm mb-6">
        Upload a background image for each elemental type. The AI generator will use it as a style reference, or invent its own matching environment if none is set.
      </p>
      <CardBackgroundManager />
    </div>
  );
}