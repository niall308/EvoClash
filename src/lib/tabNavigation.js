// Shared tab-route mapping + last-visited-subroute memory for the BottomNav tabs.
export const TAB_ROOT_PATHS = ["/", "/deck", "/generate", "/trades", "/profile"];

export const SUB_ROUTE_MAP = {
  "/lobby": "/",
  "/create-lobby": "/",
  "/join-lobby": "/",
  "/leaderboards": "/",
  "/power-ups": "/",
  "/card-upgrade": "/deck",
  "/history": "/profile",
  "/how-to-play": "/profile",
  "/milestones": "/profile",
};

export function getActiveTabPath(pathname) {
  if (pathname === "/") return "/";
  for (const prefix of Object.keys(SUB_ROUTE_MAP)) {
    if (pathname.startsWith(prefix)) return SUB_ROUTE_MAP[prefix];
  }
  return pathname;
}

const lastTabPaths = {};

export function recordTabPath(pathname) {
  const tabRoot = getActiveTabPath(pathname);
  if (TAB_ROOT_PATHS.includes(tabRoot)) {
    lastTabPaths[tabRoot] = pathname;
  }
}

export function getLastTabPath(tabRoot) {
  return lastTabPaths[tabRoot] || tabRoot;
}

// Tracks how many in-app route changes have happened this session, so pages can
// decide whether a "Back" control has real navigation history to return to
// (native history.state.idx isn't reliably populated in every environment).
let visitCount = 0;

export function recordVisit() {
  visitCount += 1;
}

export function getCanGoBack() {
  return visitCount > 1;
}