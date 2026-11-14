import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { matchingBenchmark, stackThickness } from "../js/benchmarks.js";
import { evaluate, resolveBoard } from "../js/compatibility.js";
import { recommend } from "../js/recommendation.js";
import { defaults, normalize } from "../js/storage.js";
const products = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
const benchmarks = JSON.parse(
  await readFile(
    new URL("../data/reviews/benchmarks.json", import.meta.url),
    "utf8",
  ),
);
const db = { ...products, benchmarks: benchmarks.groups };
const cooler = (id) => db.coolers.find((c) => c.id === id);
const config = (change) => ({
  ...defaults,
  cpu: "14900kf",
  board: "tuf-b760",
  caseHeight: 185,
  ramHeight: 32,
  power: "limited",
  powerLimit: 250,
  usage: "production",
  benchmarkId: "gn-14900kf-250-25dba",
  ...change,
});
test("原版与 HBC 实测记录不互相继承", () => {
  const rows = recommend(config({}), db);
  assert.equal(rows.find((c) => c.id === "d15g2").measured, null);
  assert.equal(rows.find((c) => c.id === "d15g2hbc").measured.value, 57.8);
});
test("新品有同组实测，仍不能把缺失高度视为零高度通过", () => {
  const c = config({
    cpu: "270kplus",
    board: "tuf-z890",
    powerLimit: 280,
    benchmarkId: "51972-new-single-270kplus-280",
  });
  const rows = recommend(c, db);
  assert.equal(rows.find((r) => r.id === "v8ace-intel").measured.value, 92);
  const cq = rows.find((r) => r.id === "cq125");
  assert.equal(cq.measured.value, 94);
  assert.equal(cq.heightUsed, null);
  assert.equal(cq.checks.find((r) => r.title === "机箱限高").state, "unknown");
});
test("V8 ACE 超出已证实内存净空时不外推风扇滑轨行程", () => {
  const result = evaluate(cooler("v8ace-intel"), config({ ramHeight: 46 }), db);
  assert.equal(result.checks.find((r) => r.title === "内存净空").state, "fail");
  assert.equal(result.heightUsed, 168);
});
test("CQ125 未确认的 1700 扣具不能沿用 1851 测试支持", () => {
  const result = evaluate(cooler("cq125"), config({}), db);
  assert.equal(
    result.checks.find((r) => r.title === "平台扣具").state,
    "unknown",
  );
});
test("新品和近似版本不继承旧 APEX、同系列实测", () => {
  const rows = recommend(
    config({
      cpu: "14900k",
      powerLimit: 240,
      benchmarkId: "51972-single-14900k-240",
    }),
    db,
  );
  for (const row of rows.filter((r) => r.addedAt))
    assert.equal(row.measured, null);
});
test("同组比较温差，跨 CPU、功耗或负载时不使用该实测排序", () => {
  assert.ok(matchingBenchmark(config({}), db));
  assert.equal(matchingBenchmark(config({ cpu: "14900k" }), db), null);
  assert.equal(matchingBenchmark(config({ powerLimit: 253 }), db), null);
  assert.equal(matchingBenchmark(config({ usage: "gaming" }), db), null);
  assert.equal(matchingBenchmark(config({ power: "unknown" }), db), null);
});
test("同 CPU 功耗的同噪风冷水冷候选参考同一组温差", () => {
  const rows = recommend(config({}), db);
  assert.equal(rows[0].id, "lf3360");
  assert.equal(rows[1].id, "d15g2hbc");
  assert.equal(rows[0].measured.metric, "delta-pcore");
});
test("风冷全速成绩不能作为静音排序", () => {
  const value = config({
    cpu: "265k",
    benchmarkId: "51972-single-265k-250",
    preference: "quiet",
  });
  assert.equal(matchingBenchmark(value, db), null);
});
test("主板明确冲突优先于优秀实测", () => {
  const rows = recommend(config({ board: "strix-z690i" }), db);
  assert.equal(rows.find((c) => c.id === "lf3360").status, "blocked");
  assert.equal(rows.find((c) => c.id === "d15g2hbc").status, "blocked");
  assert.notEqual(rows[0].status, "blocked");
});
test("Z690-I 的 VRM 干涉读取真实逐型号记录与出处", () => {
  const result = evaluate(cooler("u12a"), config({ board: "strix-z690i" }), db);
  const check = result.checks.find((c) => c.title === "主板安装干涉");
  assert.equal(check.state, "fail");
  assert.match(check.detail, /VRM/);
  assert.match(check.source, /noctua/);
});
test("更改主板后不能沿用上一块主板的安装冲突", () => {
  assert.equal(
    evaluate(cooler("u12a"), config({ board: "strix-z690i" }), db).status,
    "blocked",
  );
  const result = evaluate(cooler("u12a"), config({ board: "tuf-b760" }), db);
  assert.equal(
    result.checks.find((c) => c.title === "主板安装干涉").state,
    "unknown",
  );
});
test("Z690-A D4 旋转安装不误判为标准方向通过", () => {
  const result = evaluate(
    cooler("u12a"),
    config({ board: "strix-z690a-d4" }),
    db,
  );
  assert.equal(
    result.checks.find((c) => c.title === "主板安装干涉").state,
    "conditional",
  );
  assert.equal(
    result.checks.find((c) => c.title === "内存净空").state,
    "unknown",
  );
});
test("M.2 泵体冲突保留更换条件，绝不自动视为已更换", () => {
  const result = evaluate(
    cooler("lf3360"),
    config({ board: "maximus-z790-apex" }),
    db,
  );
  const check = result.checks.find((c) => c.title === "主板安装干涉");
  assert.equal(check.state, "conditional");
  assert.match(check.detail, /M.2_1/);
  assert.match(check.detail, /更换/);
});
test("手动填写完整型号可命中记录，但不模糊混用 I、E 和 D4", () => {
  assert.equal(
    resolveBoard(
      config({
        board: "custom",
        boardName: "ASUS ROG Strix Z690-I Gaming WIFI",
      }),
      db,
    ).id,
    "strix-z690i",
  );
  assert.equal(
    resolveBoard(
      config({
        board: "custom",
        boardName: "ASUS ROG Strix Z690-A Gaming WIFI",
      }),
      db,
    ),
    null,
  );
});
test("官方总装厚度优先于冷排加风扇的简单加法", () => {
  assert.equal(stackThickness(cooler("nl-lc136")), 59);
  const result = evaluate(
    cooler("nl-lc136"),
    config({ radiatorSize: 360, radiatorSpace: 56 }),
    db,
  );
  assert.equal(
    result.checks.find((c) => c.title === "冷排总厚度").state,
    "fail",
  );
});
test("Pro 水冷保持独立安装厚度，不继承非 Pro 同噪成绩", () => {
  for (const id of ["lf3pro240", "lf3pro360"]) {
    assert.equal(stackThickness(cooler(id)), 66);
    const fit = evaluate(
      cooler(id),
      config({ radiatorSize: 360, radiatorSpace: 64 }),
      db,
    );
    assert.equal(
      fit.checks.find((c) => c.title === "冷排总厚度").state,
      "fail",
    );
    assert.equal(
      recommend(config({}), db).find((c) => c.id === id).measured,
      null,
    );
  }
});
test("280 安装位不能因数字较大就确认 240 的孔位", () => {
  const fit = evaluate(
    cooler("lf3pro240"),
    config({ radiatorSize: 280, radiatorSpace: 80 }),
    db,
  );
  assert.equal(
    fit.checks.find((c) => c.title === "冷排安装位").state,
    "unknown",
  );
});
test("ASSASSIN IV 官方禁止组合被排除，不能混用同名前后缀主板", () => {
  assert.equal(
    evaluate(cooler("assassiniv"), config({ board: "strix-z690e" }), db).status,
    "blocked",
  );
  const fit = evaluate(cooler("assassiniv"), config({ board: "tuf-b760" }), db);
  assert.equal(
    fit.checks.find((c) => c.title === "主板安装干涉").state,
    "unknown",
  );
});
test("新 CPU 功耗用于选型，KF 和 Plus 不继承现有测试组", () => {
  assert.equal(db.cpus.find((c) => c.id === "12400f").turboPower, 117);
  assert.equal(db.cpus.find((c) => c.id === "250kplus").turboPower, 159);
  assert.equal(matchingBenchmark(config({ cpu: "14600kf" }), db), null);
  assert.equal(normalize(config({ cpu: "250kplus" }), db).cpu, "250kplus");
});
test("所有扩充型号在用途偏好组合下均有有效排序值", () => {
  for (const usage of ["office", "gaming", "production"])
    for (const preference of ["balanced", "quiet", "value", "performance"])
      for (const c of recommend(config({ usage, preference }), db))
        assert.ok(Number.isFinite(c.score), c.id);
});
test("分享参数保留合法实测组，不接受不存在的组", () => {
  assert.equal(normalize(config({}), db).benchmarkId, "gn-14900kf-250-25dba");
  assert.equal(
    normalize(config({ benchmarkId: "invented" }), db).benchmarkId,
    "",
  );
});
test("实测组引用产品和来源有效，并且组内型号无重复", () => {
  const ids = new Set(db.coolers.map((c) => c.id));
  for (const group of db.benchmarks) {
    assert.ok(db.cpus.some((cpu) => cpu.id === group.cpuId));
    assert.match(group.sourceUrl, /^https:\/\//);
    assert.equal(
      new Set(group.results.map((row) => row.name)).size,
      group.results.length,
    );
    for (const row of group.results) {
      if (row.coolerId) assert.ok(ids.has(row.coolerId));
      assert.ok(Number.isFinite(row.value));
    }
  }
});
