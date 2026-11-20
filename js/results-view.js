import { modelMatches } from "./search.js";
export function resultView(
  results,
  {
    type = "all",
    query = "",
    showBlocked = false,
    sort = "recommended",
    useRefPrice = false,
  } = {},
) {
  const matching = results.filter(
    (c) =>
      !c.overBudget &&
      (!useRefPrice || !c.overRefBudget) &&
      (type === "all" || c.type === type) &&
      modelMatches(c, query),
  );
  const eligible = matching.filter((c) => c.status !== "blocked");
  const blocked = matching.filter((c) => c.status === "blocked");
  const value = (c) => {
    if (sort === "price") {
      if (useRefPrice) {
        return c.price > 0
          ? c.price
          : c.effectivePrice > 0
            ? c.effectivePrice
            : Infinity;
      }
      return c.price > 0 ? c.price : Infinity;
    }
    if (sort === "ref-price") {
      const [low, high] = c.refPrice ?? [];
      return low > 0 && high >= low ? (low + high) / 2 : Infinity;
    }
    return c.type === "air" && c.heightUsed > 0 ? c.heightUsed : Infinity;
  };
  if (["price", "ref-price", "height"].includes(sort)) {
    const compare = (a, b) =>
      value(a) === value(b) ? 0 : value(a) < value(b) ? -1 : 1;
    eligible.sort(compare);
    blocked.sort(compare);
  }
  return {
    eligible,
    blocked,
    pending: eligible.filter((c) => c.status === "pending"),
    ready: eligible.filter((c) =>
      ["certified", "dimensions-ok"].includes(c.fitStage),
    ),
    visible: showBlocked ? [...eligible, ...blocked] : eligible,
  };
}
