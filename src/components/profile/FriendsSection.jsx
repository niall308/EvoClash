import React, { useEffect, useState } from "react";
import { UserPlus, Users, Copy, Check, ArrowLeftRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ProposeTradeModal from "@/components/trades/ProposeTradeModal";
import FriendDetailModal from "@/components/profile/FriendDetailModal";

const generateFriendCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function FriendsSection({ user, onUserUpdate }) {
  const [friends, setFriends] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [myCards, setMyCards] = useState([]);
  const [tradeFriend, setTradeFriend] = useState(null);
  const [tradeMessage, setTradeMessage] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    base44.entities.Friend.filter({ created_by_id: user.id }, "-created_date").then(setFriends);
    base44.entities.Card.filter({ ownerId: user.id }).then(setMyCards);
  }, [user.id]);

  useEffect(() => {
    if (!user.friendCode) {
      base44.auth.updateMe({ friendCode: generateFriendCode() }).then(onUserUpdate);
    }
  }, [user.friendCode]);

  const copyCode = () => {
    navigator.clipboard.writeText(user.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setAdding(true);
    setStatus("");
    const { data } = await base44.functions.invoke("searchUser", { query: query.trim() });
    if (data?.error) {
      setStatus(data.error);
    } else if (!data?.found) {
      setStatus("No player found with that username, code, or email.");
    } else if (friends?.some((f) => f.friendUserId === data.id)) {
      setStatus("You're already friends with this player.");
    } else {
      const created = await base44.entities.Friend.create({ friendUserId: data.id, friendName: data.username });
      setFriends((f) => [created, ...(f || [])]);
      setQuery("");
      setStatus(`Added ${data.username} as a friend!`);
    }
    setAdding(false);
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Users className="w-5 h-5 text-amber-400" /> Friends
      </h2>

      <div className="bg-white/5 rounded-xl p-3 mb-3">
        <p className="text-white/40 text-xs mb-1">Your Friend Code</p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-black tracking-widest text-amber-300">{user.friendCode || "..."}</p>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 bg-white/10 text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Username, code, or email"
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button
          disabled={adding}
          className="flex items-center gap-1.5 bg-amber-500 text-black font-bold rounded-lg px-3 py-2 text-sm disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" /> {adding ? "Adding..." : "Add"}
        </button>
      </form>
      {status && <p className="text-xs text-white/50 mb-3">{status}</p>}

      <div className="space-y-2">
        {friends === null ? (
          <p className="text-white/40 text-sm">Loading...</p>
        ) : friends.length === 0 ? (
          <p className="text-white/40 text-sm">No friends added yet.</p>
        ) : (
          friends.map((f) => (
            <div key={f.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
              <button onClick={() => setSelectedFriend(f)} className="font-semibold text-sm text-left">
                {f.friendName}
              </button>
              <button
                onClick={() => setTradeFriend(f)}
                className="flex items-center gap-1 bg-amber-500/20 text-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-full"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Trade
              </button>
            </div>
          ))
        )}
      </div>
      {tradeMessage && <p className="text-xs text-emerald-400 mt-3">{tradeMessage}</p>}

      {tradeFriend && (
        <ProposeTradeModal
          friend={tradeFriend}
          myCards={myCards}
          maxCoins={user.coins || 0}
          onClose={() => setTradeFriend(null)}
          onProposed={() => {
            setTradeFriend(null);
            setTradeMessage(`Trade request sent to ${tradeFriend.friendName}!`);
            setTimeout(() => setTradeMessage(""), 4000);
          }}
        />
      )}

      {selectedFriend && (
        <FriendDetailModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onRemove={(id) => {
            setFriends((prev) => prev.filter((f) => f.id !== id));
            setSelectedFriend(null);
          }}
        />
      )}
    </div>
  );
}