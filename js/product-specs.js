/** Published construction facts and test conditions. Neither is a guaranteed watt limit. */
export function constructionSummary(cooler) {
  const e = cooler.construction || {};
  const liquid = cooler.type === "aio";
  const methods = {
    "press-fit": "穿 Fin（压接）",
    soldered: "焊接（未注明回流）",
    reflow: "回流焊",
    mixed: "混合工艺",
    unknown: "连接工艺待核对",
    "not-applicable": "不适用（水路冷排）",
  };
  const count = e.heatpipes?.count;
  return {
    heatpipes: liquid
      ? "不适用（水冷）"
      : Number.isInteger(count) && count > 0
        ? `${count} 根${e.heatpipes.diameterMm ? ` × ${e.heatpipes.diameterMm} mm` : ""}`
        : "根数待核对",
    finJoint: liquid
      ? "不适用（水路冷排）"
      : methods[e.finJoint?.method] || methods.unknown,
    base: e.baseContact?.detail || "底座结构待核对",
    rating:
      Number.isFinite(e.thermalRating?.watts) && e.thermalRating.watts > 0
        ? `${e.thermalRating.watts} W（${e.thermalRating.label || "厂商标称"}）`
        : "标称瓦数待核实",
  };
}
export function recordedTests(coolerId, catalog) {
  return (catalog.benchmarks || []).flatMap((group) =>
    group.results
      .filter((row) => row.coolerId === coolerId)
      .map((row) => ({ group, row })),
  );
}
