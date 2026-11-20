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
export function formatRefPrice(cooler) {
  if (
    Array.isArray(cooler.refPrice) &&
    cooler.refPrice.length >= 2 &&
    Number.isFinite(cooler.refPrice[0]) &&
    Number.isFinite(cooler.refPrice[1])
  ) {
    return `¥${cooler.refPrice[0]}–${cooler.refPrice[1]}`;
  }
  return "暂无参考价";
}
export function cardSpecItems(cooler, fit = {}) {
  if (cooler.type === "aio") {
    const total =
      cooler.assemblyThickness ??
      cooler.radiatorThickness + cooler.fanThickness;
    const thickLabel = total >= 60 ? "加厚排" : "标准厚";
    const marginText =
      fit.spaceMargin != null && fit.spaceMargin >= 0
        ? ` · 余 ${fit.spaceMargin}mm`
        : "";
    return [
      {
        label: "冷排本体",
        value: `${cooler.radiatorLength} × ${cooler.radiatorWidth} mm`,
      },
      {
        label: "冷排+风扇总厚",
        value: `${total} mm（${thickLabel}）${marginText}`,
      },
      {
        label: "结构特征",
        value: `${cooler.radiatorSize} 水冷 · 含冷头水泵`,
      },
    ];
  }
  const heightValue =
    cooler.height === null
      ? "高度待核对"
      : fit.heightUsed && fit.heightUsed !== cooler.height
        ? `${cooler.height}→${fit.heightUsed} mm (抬扇)`
        : `${cooler.height} mm${fit.spaceMargin != null && fit.spaceMargin >= 0 ? ` · 余 ${fit.spaceMargin}mm` : ""}`;
  const ramValue =
    cooler.ramOverhang === false
      ? "不遮挡内存槽"
      : cooler.ramClearance != null
        ? `净空 ${cooler.ramClearance} mm${cooler.ramLift ? " · 可抬扇" : ""}`
        : "覆盖前槽 · 抬扇待核";
  const count = cooler.construction?.heatpipes?.count;
  const formLabel =
    cooler.formFactor === "downdraft" ? "下压式超薄" : "塔式风冷";
  return [
    { label: "安装高度", value: heightValue },
    { label: "内存避让", value: ramValue },
    {
      label: "规格结构",
      value: `${Number.isInteger(count) && count > 0 ? `${count} 热管` : "风冷"} · ${formLabel}`,
    },
  ];
}
