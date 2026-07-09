import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2 } from "lucide-react";
import CardBackManager from "@/components/admin/CardBackManager";
import CreatureAnimationManager from "@/components/admin/CreatureAnimationManager";

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-8">Admin Panel</h1>
      <CardBackManager />
      <div className="h-8" />
      <CreatureAnimationManager />
    </div>
  );
}