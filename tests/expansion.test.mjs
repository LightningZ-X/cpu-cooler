import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate, resolveBoard } from "../js/compatibility.js";
import { stackThickness } from "../js/benchmarks.js";
import { defaults } from "../js/storage.js";
const db = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
const cooler = (id) => db.coolers.find((c) => c.id === id);
test("新增 ASSASSIN IV 禁装只作用于精确主板版本", () => {
  for (const board of [
    "tuf-b760-original",
    "strix-b760g",
    "strix-z790h",
    "strix-z690f",
    "strix-z790i",
  ]) {
    const fit = evaluate(
      cooler("assassiniv"),
      { ...defaults, cpu: "12400f", board },
      db,
    );
    assert.equal(
      fit.checks.find((c) => c.title === "主板安装干涉").state,
      "fail",
    );
  }
  const fit = evaluate(
    cooler("assassiniv"),
    { ...defaults, cpu: "12400f", board: "tuf-b760" },
    db,
  );
  assert.equal(
    fit.checks.find((c) => c.title === "主板安装干涉").state,
    "unknown",
  );
});
test("手动主板完整型号不可省略修订号或 WIFI II 后缀", () => {
  const b = db.boards.find((b) => b.id === "b760m-ds3h-d4-10");
  assert.equal(
    resolveBoard({ board: "custom", boardName: b.name }, db).id,
    b.id,
  );
  assert.equal(
    resolveBoard(
      { board: "custom", boardName: b.name.replace(/\s*\(rev\..*\)/i, "") },
      db,
    ),
    null,
  );
  assert.notEqual(
    resolveBoard(
      {
        board: "custom",
        boardName: db.boards.find((b) => b.id === "tuf-b760").name,
      },
      db,
    ).id,
    "tuf-b760-original",
  );
});
test("安装记录引用有效且组合无重复", () => {
  assert.equal(
    new Set(db.overrides.map((o) => `${o.board}/${o.cooler}`)).size,
    db.overrides.length,
  );
  for (const o of db.overrides) {
    assert.ok(db.boards.some((b) => b.id === o.board));
    assert.ok(cooler(o.cooler));
    assert.match(o.source, /^https:\/\//);
  }
});
test("LS SE DIGITAL 按52mm叠厚检查，51mm空间排除", () => {
  for (const id of ["ls520sedigital", "ls720sedigital"]) {
    const c = cooler(id);
    assert.equal(stackThickness(c), 52);
    assert.equal(
      evaluate(
        c,
        {
          ...defaults,
          cpu: "245k",
          board: "tuf-z890",
          radiatorSize: c.radiatorSize,
          radiatorSpace: 51,
        },
        db,
      ).status,
      "blocked",
    );
  }
});
