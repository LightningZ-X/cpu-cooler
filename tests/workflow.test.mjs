import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resultView } from "../js/results-view.js";
import { normalizeView } from "../js/view-state.js";
import { nextSteps } from "../js/next-steps.js";
import { defaults } from "../js/storage.js";
const db = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
test("报价排序未知置后且明确冲突始终排在候选之后，不修改原结果", () => {
  const rows = [
    { id: "a", price: null, status: "pending", type: "air" },
    { id: "b", price: 200, status: "pending", type: "air" },
    { id: "c", price: 50, status: "blocked", type: "air" },
    { id: "d", price: 100, status: "pending", type: "air" },
  ];
  const sorted = resultView(rows, { sort: "price", showBlocked: true });
  assert.deepEqual(
    sorted.visible.map((c) => c.id),
    ["d", "b", "a", "c"],
  );
  assert.deepEqual(
    rows.map((c) => c.id),
    ["a", "b", "c", "d"],
  );
  assert.equal(sorted.eligible.length, 3);
});
test("风冷高度按含抬扇高度排序，缺失与水冷不视作零高度", () => {
  const rows = [
    { id: "aio", type: "aio", heightUsed: 20, status: "pending" },
    {
      id: "lift",
      type: "air",
      height: 165,
      heightUsed: 181,
      status: "pending",
    },
    { id: "unknown", type: "air", heightUsed: null, status: "pending" },
    { id: "small", type: "air", heightUsed: 145, status: "pending" },
  ];
  const sorted = resultView(rows, { sort: "height" });
  assert.deepEqual(
    sorted.eligible.slice(0, 2).map((c) => c.id),
    ["small", "lift"],
  );
  assert.deepEqual(
    sorted.eligible.slice(2).map((c) => c.id),
    ["aio", "unknown"],
  );
});
test("恢复筛选和对比只接受有效枚举、当前型号和最多三款", () => {
  const ids = db.coolers.slice(0, 4).map((c) => c.id);
  const state = normalizeView(
    {
      filter: "oops",
      sort: "benchmark-hack",
      query: "x".repeat(150),
      showBlocked: "true",
      compare: ["deleted", ids[0], ids[0], ...ids.slice(1)],
    },
    db,
  );
  assert.equal(state.filter, "all");
  assert.equal(state.sort, "recommended");
  assert.equal(state.query.length, 100);
  assert.equal(state.showBlocked, false);
  assert.deepEqual(state.compare, ids.slice(0, 3));
  assert.doesNotThrow(() => normalizeView(null, db));
});
test("核对任务将插槽冲突和缺介质列为先处理项目，水冷不要求风冷限高", () => {
  const tasks = nextSteps(
    { ...defaults, board: "tuf-b760", thermalInterface: "missing" },
    db,
    "aio",
  );
  assert.equal(tasks[0].target, "board");
  assert.match(tasks[0].title, /修正/);
  assert.equal(tasks[1].target, "thermal-interface");
  assert.ok(
    !tasks.some((t) => ["case-height", "ram-height"].includes(t.target)),
  );
  const custom = nextSteps(
    { ...defaults, board: "custom", boardSocket: "LGA1700" },
    db,
  );
  assert.match(custom[0].title, /修正/);
});
test("填完主要参数仍要求逐型号核对，不把填写完成当作安装认证", () => {
  const tasks = nextSteps(
    {
      ...defaults,
      board: "tuf-z890",
      caseHeight: 180,
      ramHeight: 32,
      power: "intel",
      thermalInterface: "paste",
    },
    db,
    "air",
  );
  assert.equal(tasks.length, 0);
});
