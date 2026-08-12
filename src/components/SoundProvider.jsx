import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { loadSoundAssets, setSoundSettings, setBgmForRoute, play } from "@/lib/soundEngine";

// Mounts once inside ProtectedRoute. Loads sound assets, applies the user's sound
// toggles, switches BGM by route, plays a global button-tap SFX on interactive taps,
// and plays a reward-claim SFX whenever the app signals coins were granted on a win.
export default function SoundProvider({ children }) {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    loadSoundAssets();
  }, []);

  useEffect(() => {
    setSoundSettings(user || {});
  }, [user]);

  useEffect(() => {
    setBgmForRoute(location.pathname);
  }, [location.pathname]);

  // Global button-tap SFX on buttons/links/cards.
  useEffect(() => {
    const handler = (e) => {
      const target = e.target.closest?.("button, a, [role='button'], .card-interactive");
      if (target) play("button_tap");
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  // Reward-claim SFX when a battle rewards coins (only dispatched on a win).
  useEffect(() => {
    const onCoins = () => play("reward_claim");
    window.addEventListener("coins-claimed", onCoins);
    return () => window.removeEventListener("coins-claimed", onCoins);
  }, []);

  return children;
}