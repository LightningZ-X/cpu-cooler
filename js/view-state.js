const key = "coolerguide-view-v1";
export function normalizeView(raw, catalog) {
  raw = raw && typeof raw === "object" ? raw : {};
  return {
    filter: ["all", "air", "aio"].includes(raw.filter) ? raw.filter : "all",
    query: typeof raw.query === "string" ? raw.query.slice(0, 100) : "",
    sort: ["recommended", "price", "ref-price", "height"].includes(raw.sort)
      ? raw.sort
      : "recommended",
    showBlocked: raw.showBlocked === true,
    layout: raw.layout === "list" ? "list" : "grid",
    useRefPrice: raw.useRefPrice !== false,
    compare: Array.isArray(raw.compare)
      ? [
          ...new Set(
            raw.compare.filter((id) =>
              catalog.coolers.some((c) => c.id === id),
            ),
          ),
        ].slice(0, 3)
      : [],
  };
}
export function loadView(catalog) {
  try {
    return normalizeView(JSON.parse(localStorage.getItem(key)), catalog);
  } catch {
    return normalizeView({}, catalog);
  }
}
export function saveView(view) {
  try {
    localStorage.setItem(key, JSON.stringify(view));
  } catch {}
}
