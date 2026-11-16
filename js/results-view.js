import { modelMatches } from "./search.js";
export function resultView(
  results,
  { type = "all", query = "", showBlocked = false } = {},
) {
  const matching = results.filter(
    (c) =>
      !c.overBudget &&
      (type === "all" || c.type === type) &&
      modelMatches(c, query),
  );
  const eligible = matching.filter((c) => c.status !== "blocked");
  return {
    eligible,
    blocked: matching.filter((c) => c.status === "blocked"),
    pending: eligible.filter((c) => c.status === "pending"),
    visible: showBlocked ? matching : eligible,
  };
}
