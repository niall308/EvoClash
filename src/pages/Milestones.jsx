import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft } from "lucide-react";
import MilestonesSection from "@/components/profile/MilestonesSection";
import PullToRefresh from "@/components/common/PullToRefresh";
import { useAuth } from "@/lib/AuthContext";

export default function Milestones() {
  const { user, updateUser, checkUserAuth } = useAuth();

  if (!user) return null;

  return (
    <PullToRefresh onRefresh={checkUserAuth}>
    <div className="text-white px-6 py-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-6">Milestones</h1>
      <MilestonesSection user={user} onUserUpdate={updateUser} />
    </div>
    </PullToRefresh>
  );
}