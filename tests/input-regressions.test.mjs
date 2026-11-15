import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { modelMatches } from "../js/search.js";
const db = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
test("CPU搜索忽略常见空格、连字符与全角输入", () => {
  const cpu = db.cpus.find((c) => c.id === "12400f");
  for (const query of [
    "i5 12400f",
    "i5-12400F",
    "ｉ５　１２４００ｆ",
    "Intel i5 12400F",
  ])
    assert.ok(modelMatches(cpu, query), query);
});
test("散热器搜索V8-ACE等价于V8 ACE，型号后缀仍参与匹配", () => {
  assert.ok(
    modelMatches(
      db.coolers.find((c) => c.id === "v8ace-intel"),
      "V8-ACE",
    ),
  );
  assert.ok(
    !modelMatches(
      db.coolers.find((c) => c.id === "ak400"),
      "AK400 DIGITAL PRO",
    ),
  );
});
test("安装尺寸字段允许合理小数毫米", () => {
  for (const id of ["case-height", "ram-height", "radiator-space"]) {
    const input = html.match(
      new RegExp('<input[^>]*id="' + id + '"[^>]*>'),
    )?.[0];
    assert.match(input || "", /step="any"/, id);
  }
});
