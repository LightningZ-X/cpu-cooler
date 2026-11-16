/** Bundled data works on file://; fetch remains available for module previews. */
export async function loadData(resource) {
  const embedded = globalThis.COOLERGUIDE_DATA?.[resource];
  if (embedded !== undefined) return embedded;
  const response = await fetch(resource);
  if (!response.ok) throw new Error(`数据加载失败：${resource}`);
  return response.json();
}
export const assetUrl = (resource) =>
  globalThis.COOLERGUIDE_ASSETS?.[resource] || resource;
export function replaceLocation(url) {
  try {
    history.replaceState(null, "", url);
  } catch {
    /* Some file origins restrict history. */
  }
}
