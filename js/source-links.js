export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}

/** Catalog and review links can be imported from outside this project. */
export function sourceHref(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:")
      return escapeHtml(url.href);
  } catch {}
  return "#";
}
