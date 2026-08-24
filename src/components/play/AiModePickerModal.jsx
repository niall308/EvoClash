import React from "react";
import { useNavigate } from "react-router-dom";
import { Swords, X, Bot } from "lucide-react";

export default function AiModePickerModal({ difficulty, onClose }) {
  const navigate = useNavigate();
  const go = (mode) => {
    onClose();
    if (mode === "3v3") navigate("/battle-3v3", { state: { difficulty } });
    else navigate("/battle", { state: { difficulty } });
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black flex items-center gap-2"><Bot className="w-5 h-5" /> Battle vs AI</h2>
          <button onClick={onClose} className="text-white/60 p-1"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-white/60 text-sm mb-4">Choose a game mode</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => go("1v1")} className="flex items-center gap-3 bg-gradient-to-r from-red-600 to-orange-500 p-4 rounded-2xl font-bold active:scale-95 transition-transform">
            <Swords className="w-6 h-6" />
            <div className="text-left">
              <p>1v1 Mode</p>
              <p className="text-[11px] font-normal text-white/80">Classic head-to-head duel</p>
            </div>
          </button>
          <button onClick={() => go("3v3")} className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-fuchsia-500 p-4 rounded-2xl font-bold active:scale-95 transition-transform">
            <Swords className="w-6 h-6" />
            <div className="text-left">
              <p>3v3 Mode</p>
              <p className="text-[11px] font-normal text-white/80">3 cards each side · target & defeat · +100 win / +15 loss</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}