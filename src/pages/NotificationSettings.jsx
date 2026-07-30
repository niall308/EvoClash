import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Swords, Gift, ArrowLeftRight, Mail, RotateCcw, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";

const OPTIONS = [
  {
    key: "notifyBattleInvites",
    icon: Swords,
    title: "Battle Invites",
    description: "When another player invites you to play",
  },
  {
    key: "notifyDailyRewardReady",
    icon: Gift,
    title: "Daily Reward Ready",
    description: "When your daily reward is ready to claim again",
  },
  {
    key: "notifyTradeRequests",
    icon: ArrowLeftRight,
    title: "Trade Requests",
    description: "When you receive a new trade request",
  },
  {
    key: "notifyYourTurn",
    icon: RotateCcw,
    title: "Your Turn",
    description: "When it becomes your turn in an offline battle",
  },
  {
    key: "notifyLobbyJoin",
    icon: Users,
    title: "Lobby Joined",
    description: "When someone joins your lobby",
  },
  {
    key: "notifyEmails",
    icon: Mail,
    title: "Emails",
    description: "Receive any notifications by email",
  },
];

export default function NotificationSettings() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(null);

  const handleToggle = async (key, value) => {
    setSaving(key);
    const updatedUser = await base44.auth.updateMe({ [key]: value });
    updateUser(updatedUser);
    setSaving(null);
  };

  if (!user) return null;

  return (
    <div className="text-white px-6 py-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-6">Notifications</h1>

      <div className="space-y-3">
        {OPTIONS.map(({ key, icon: Icon, title, description }) => {
          const enabled = user[key] === true;
          return (
            <div key={key} className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 pr-3">
                <Icon className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-white/40 text-xs">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold ${enabled ? "text-emerald-400" : "text-white/40"}`}>
                  {enabled ? "On" : "Off"}
                </span>
                <Switch
                  checked={enabled}
                  disabled={saving === key}
                  onCheckedChange={(value) => handleToggle(key, value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}