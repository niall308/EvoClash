import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import FriendsSection from "@/components/profile/FriendsSection";

export default function Friends() {
  const { user, updateUser } = useAuth();

  if (!user) return null;

  return (
    <div className="text-white px-6 py-6">
      <Link to="/human-battle" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <FriendsSection user={user} onUserUpdate={updateUser} />
    </div>
  );
}