/**
 * Route table for the four main pages.
 *
 * The "pages" (Mapa / Listahan / Buod / Mag-ulat) are all rendered by the single
 * `Index` component, which keeps shared state (reports fetch, filters, selection)
 * and derives the active tab from the URL pathname. Keeping the mapping here
 * means the router config, the sidebar, the top nav and the bottom nav can never
 * drift apart.
 */

export type Tab = "map" | "list" | "dashboard" | "report";

/**
 * Single point of truth for the Mag-ulat <form> element id. Kept on the form
 * element itself (labels, tests); submission is handled by the form's own
 * bottom button since the button moved out of the right rail.
 */
export const MAG_ULAT_FORM_ID = "mag-ulat-form";

/** Canonical URL for each tab (Filipino names, matching the nav labels). */
export const TAB_PATHS: Record<Tab, string> = {
  map: "/mapa",
  list: "/listahan",
  dashboard: "/buod",
  report: "/mag-ulat",
};

/** Accepted path aliases → tab. `/` is Mapa (de-facto home). */
const PATH_ALIASES: Record<string, Tab> = {
  "/": "map",
  "/mapa": "map",
  "/map": "map",
  "/listahan": "list",
  "/list": "list",
  "/buod": "dashboard",
  "/dashboard": "dashboard",
  "/mag-ulat": "report",
  "/magulat": "report",
  "/report": "report",
};

/** Lower-case, strip query/hash and trailing slashes so `/listahan/` resolves too. */
const normalizePath = (pathname: string): string => {
  const path = (pathname || "/").split("?")[0].split("#")[0];
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return trimmed.toLowerCase();
};

/** Resolve a URL pathname to a tab. Unknown paths fall back to Mapa. */
export const tabFromPath = (pathname: string): Tab =>
  PATH_ALIASES[normalizePath(pathname)] ?? "map";

/** Canonical link target for a tab. */
export const pathForTab = (tab: Tab): string => TAB_PATHS[tab] ?? TAB_PATHS.map;

/** App routes that all render `Index`; used to build the router config. */
export const TAB_ROUTE_PATHS: string[] = Array.from(new Set(Object.values(TAB_PATHS)));

/** Link target for a tab, carrying the current query string (keeps filters). */
export const tabHref = (tab: Tab, search = ""): string => pathForTab(tab) + (search ?? "");