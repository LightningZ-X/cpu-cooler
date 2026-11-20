import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate } from "../js/compatibility.js";
import { recommend } from "../js/recommendation.js";
import { defaults, normalize } from "../js/storage.js";
const db = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
const byId = (id) => db.coolers.find((c) => c.id === id);
const config = (change = {}) => ({
  ...defaults,
  cpu: "245k",
  board: "tuf-z890",
  caseHeight: 180,
  ramHeight: 32,
  ...change,
});

test("CPU 与主板插槽冲突阻止所有方案", () => {
  for (const c of recommend(config({ board: "tuf-b760" }), db))
    assert.equal(c.status, "blocked");
});
test("无主板组合证据时不能标记完全兼容", () => {
  const result = evaluate(byId("u12a"), config({ headers: true }), db);
  assert.equal(result.status, "pending");
  assert.equal(
    result.checks.find((c) => c.title === "主板安装干涉").state,
    "unknown",
  );
});
test("高内存抬高风扇后超过机箱限高", () => {
  const result = evaluate(
    byId("d15g2"),
    config({ ramHeight: 45, caseHeight: 175 }),
    db,
  );
  assert.equal(result.heightUsed, 181);
  assert.equal(result.status, "blocked");
  assert.equal(
    result.checks.find((c) => c.title === "内存净空").state,
    "conditional",
  );
});
test("高内存且空间足够，仍明确需要抬高风扇", () => {
  const result = evaluate(
    byId("d15g2"),
    config({ ramHeight: 40, caseHeight: 185 }),
    db,
  );
  assert.equal(result.heightUsed, 176);
  assert.equal(result.status, "pending");
});
test("缺少内存高度不能保证实际风冷总高", () => {
  const result = evaluate(byId("d15g2"), config({ ramHeight: null }), db);
  assert.equal(
    result.checks.find((c) => c.title === "机箱限高").state,
    "unknown",
  );
});
test("内存净空未收录的产品不虚构通过", () => {
  const result = evaluate(byId("ps120se"), config(), db);
  assert.equal(
    result.checks.find((c) => c.title === "内存净空").state,
    "unknown",
  );
});
test("不覆盖内存插槽的型号不要求内存高度", () => {
  const result = evaluate(byId("u12a"), config({ ramHeight: null }), db);
  assert.equal(result.checks.find((c) => c.title === "内存净空").state, "pass");
});
test("风冷高度相等仍提示实测公差", () => {
  const result = evaluate(byId("u12a"), config({ caseHeight: 158 }), db);
  assert.equal(
    result.checks.find((c) => c.title === "机箱限高").state,
    "conditional",
  );
});
test("风冷超过机箱限高时阻止安装", () =>
  assert.equal(
    evaluate(byId("u12a"), config({ caseHeight: 150 }), db).status,
    "blocked",
  ));
test("水冷厚度按冷排加风扇计算", () => {
  const result = evaluate(
    byId("lf3360"),
    config({ radiatorSize: 360, radiatorSpace: 60 }),
    db,
  );
  assert.equal(result.status, "blocked");
  assert.match(
    result.checks.find((c) => c.title === "冷排总厚度").detail,
    /63 mm/,
  );
});
test("240 安装位不能安装 360 水冷", () =>
  assert.equal(
    evaluate(
      byId("lf3360"),
      config({ radiatorSize: 240, radiatorSpace: 80 }),
      db,
    ).status,
    "blocked",
  ));
test("不支持水冷的安装位明确失败", () =>
  assert.equal(
    evaluate(byId("lf3360"), config({ radiatorSize: 0 }), db).status,
    "blocked",
  ));
test("未知水冷安装位保持待确认", () =>
  assert.equal(evaluate(byId("lf3360"), config(), db).status, "pending"));
test("未确认长宽、接口和主板干涉，不因厚度满足就通过", () => {
  const result = evaluate(
    byId("lf3360"),
    config({ radiatorSize: 360, radiatorSpace: 80 }),
    db,
  );
  assert.equal(result.status, "pending");
  assert.equal(
    result.checks.find((c) => c.title === "冷排周边空间").state,
    "unknown",
  );
});
test("有依据的组合覆盖记录才允许已知检查通过", () => {
  const fixture = {
    ...db,
    overrides: [
      {
        board: "tuf-z890",
        cooler: "u12a",
        state: "pass",
        detail: "仅用于单元测试的适配证据",
      },
    ],
  };
  assert.equal(
    evaluate(byId("u12a"), config({ headers: true }), fixture).status,
    "compatible",
  );
});
test("组合明确冲突优先于其他检查", () => {
  const fixture = {
    ...db,
    overrides: [
      { board: "tuf-z890", cooler: "u12a", state: "fail", detail: "测试干涉" },
    ],
  };
  assert.equal(evaluate(byId("u12a"), config(), fixture).status, "blocked");
});
test("高功耗持续负载优先考察大冷排", () => {
  assert.equal(
    recommend(config({ cpu: "285k", usage: "production" }), db)[0].id,
    "lf3360",
  );
});
test("限制功耗影响考察顺序", () => {
  assert.notEqual(
    recommend(
      config({
        cpu: "285k",
        usage: "production",
        power: "limited",
        powerLimit: 100,
      }),
      db,
    )[0].id,
    "lf3360",
  );
});
test("已知超预算明确标记，未知价格不当作免费", () => {
  const list = recommend(config({ budget: 500 }), db, { u12a: 800 });
  assert.equal(list.find((c) => c.id === "u12a").overBudget, true);
  assert.equal(list.find((c) => c.id === "d15g2").price, null);
  assert.equal(list.find((c) => c.id === "d15g2").overBudget, false);
});
test("未知扣具支持不能直接通过", () => {
  const result = evaluate(
    { ...byId("u12a"), sockets: ["LGA1700"] },
    config(),
    db,
  );
  assert.equal(
    result.checks.find((c) => c.title === "平台扣具").state,
    "unknown",
  );
});
test("分享链接和存储中的异常值会归一化", () => {
  const result = normalize(
    {
      cpu: "bad",
      caseHeight: -1,
      ramHeight: "Infinity",
      radiatorSize: "0",
      headers: "true",
      board: "custom",
      boardSocket: "TR4",
      budget: 999999,
    },
    db,
  );
  assert.equal(result.cpu, "245k");
  assert.equal(result.caseHeight, null);
  assert.equal(result.ramHeight, null);
  assert.equal(result.radiatorSize, 0);
  assert.equal(result.headers, false);
  assert.equal(result.boardSocket, "");
  assert.equal(result.budget, null);
});
test("未选择主板时不能沿用旧手动插槽", () =>
  assert.equal(
    normalize({ board: "", boardSocket: "LGA1851" }, db).boardSocket,
    "",
  ));
test("目录 ID 唯一，来源完整且规格数值有效", () => {
  for (const group of ["cpus", "boards", "coolers"]) {
    assert.equal(new Set(db[group].map((c) => c.id)).size, db[group].length);
    for (const c of db[group]) assert.match(c.source, /^https:\/\//);
  }
  for (const c of db.coolers)
    assert.ok(
      c.type === "air"
        ? c.height > 0 || (c.height === null && c.socketEvidence === "review")
        : c.radiatorThickness + c.fanThickness > 0,
    );
});
