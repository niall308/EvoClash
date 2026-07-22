import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const handleTouchStart = (e) => {
    if (refreshing || window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPull(Math.min(delta * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pull > THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPull(0);
    startY.current = null;
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="flex items-center justify-center overflow-hidden transition-all duration-200" style={{ height: pull }}>
        <Loader2 className={`w-5 h-5 text-white/60 ${refreshing ? "animate-spin" : ""}`} />
      </div>
      {children}
    </div>
  );
}