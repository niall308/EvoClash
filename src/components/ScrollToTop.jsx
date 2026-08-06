import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      const id = getHashId(hash);
      // Schedule the scroll on the next frame instead of an arbitrary 50ms
      // timer so the browser paints the new route and then smooth-scrolls in
      // a single frame cycle, avoiding extra layout work.
      const rafId = window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      });
      return () => window.cancelAnimationFrame(rafId);
    }

    // Instant (auto) jump for non-anchor navigations — smooth scrolling a
    // large layout to the top on every route change is expensive and rarely
    // desirable for programmatic navigation.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash, navigationType]);

  return null;
}