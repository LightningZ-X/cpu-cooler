import { modelMatches } from "./search.js";
export function resultView(
  results,
  { type = "all", query = "", showBlocked = false, sort = "recommended" } = {},
) {
  const matching = results.filter(
    (c) =>
      !c.overBudget &&
      (type === "all" || c.type === type) &&
      modelMatches(c, query),
  );
  const eligible = matching.filter((c) => c.status !== "blocked");
  const blocked = matching.filter((c) => c.status === "blocked");
  const value = (c) =>
    sort === "price"
      ? c.price > 0
        ? c.price
        : Infinity
      : c.type === "air" && c.heightUsed > 0
        ? c.heightUsed
        : Infinity;
  if (["price", "height"].includes(sort)) {
    const compare = (a, b) =>
      value(a) === value(b) ? 0 : value(a) < value(b) ? -1 : 1;
    eligible.sort(compare);
    blocked.sort(compare);
  }
  return {
    eligible,
    blocked,
    pending: eligible.filter((c) => c.status === "pending"),
    visible: showBlocked ? [...eligible, ...blocked] : eligible,
  };
}
