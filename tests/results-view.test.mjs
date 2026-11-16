import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resultView } from "../js/results-view.js";
import { recommend } from "../js/recommendation.js";
import { defaults } from "../js/storage.js";
const db = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
test("隐藏冲突只改变展示，不把冲突型号算作候选", () => {
  const results = recommend(
    { ...defaults, cpu: "245k", board: "tuf-b760" },
    db,
  );
  const normal = resultView(results),
    expanded = resultView(results, { showBlocked: true });
  assert.equal(normal.eligible.length, 0);
  assert.equal(normal.visible.length, 0);
  assert.equal(normal.blocked.length, db.coolers.length);
  assert.equal(expanded.visible.length, db.coolers.length);
  assert.ok(expanded.visible.every((c) => c.status === "blocked"));
});
test("结果摘要随型号、类型和预算筛选同步，未知项仍待确认", () => {
  const results = recommend(
    { ...defaults, cpu: "12400f", board: "tuf-b760-original" },
    db,
  );
  const filtered = resultView(results, { type: "air", query: "V8-ACE" });
  assert.deepEqual(
    filtered.visible.map((c) => c.id),
    ["v8ace-intel"],
  );
  assert.equal(filtered.pending.length, 1);
  assert.equal(filtered.visible[0].status, "pending");
  const budget = resultView(
    results.map((c) => ({ ...c, overBudget: c.id === "v8ace-intel" })),
    { query: "V8-ACE" },
  );
  assert.equal(budget.eligible.length, 0);
});
test("精确禁装在搜索结果中仍可展开查看，不受展示开关改写", () => {
  const results = recommend(
    { ...defaults, cpu: "12400f", board: "tuf-b760-original" },
    db,
  );
  const filtered = resultView(results, { query: "ASSASSIN IV" });
  assert.equal(filtered.blocked.length, 1);
  assert.equal(filtered.visible.length, 0);
  const expanded = resultView(results, {
    query: "ASSASSIN IV",
    showBlocked: true,
  });
  assert.equal(expanded.visible[0].id, "assassiniv");
  assert.equal(expanded.visible[0].status, "blocked");
});
