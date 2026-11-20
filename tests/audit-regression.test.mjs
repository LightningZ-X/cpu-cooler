import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate } from "../js/compatibility.js";
import { recommend } from "../js/recommendation.js";
import { resultView } from "../js/results-view.js";
import { sourceHref } from "../js/source-links.js";
import { defaults } from "../js/storage.js";

const db = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url)),
);
const byId = (id) => db.coolers.find((cooler) => cooler.id === id);

test("冷排尺寸待实物核对时不能进入尺寸匹配统计", () => {
  const config = {
    ...defaults,
    board: "tuf-z890",
    radiatorSize: 360,
    radiatorSpace: 75,
  };
  const cooler = byId("lf3360");
  const unchecked = evaluate(cooler, config, db);
  assert.equal(unchecked.fitStage, "pending");
  const checked = evaluate(cooler, { ...config, radiatorFit: true }, db);
  assert.equal(checked.fitStage, "dimensions-ok");
  assert.equal(checked.status, "pending");
  assert.equal(
    evaluate(cooler, { ...config, radiatorFit: true, radiatorSize: 420 }, db)
      .fitStage,
    "pending",
  );
});

test("标称高度可容纳的风冷仍不计入尺寸匹配", () => {
  const rows = recommend(
    { ...defaults, board: "tuf-z890", caseHeight: 180 },
    db,
  );
  assert.ok(rows.some((item) => item.fitStage === "nominal-ok"));
  assert.ok(
    resultView(rows).ready.every((item) => item.fitStage !== "nominal-ok"),
  );
});

test("关闭参考价后估价变化不能改变推荐分数或顺序", () => {
  const withoutPrices = {
    ...db,
    coolers: db.coolers.map((cooler) => ({ ...cooler, refPrice: null })),
  };
  for (const preference of ["balanced", "value"]) {
    const config = { ...defaults, preference };
    const signature = (catalog) =>
      recommend(config, catalog, {}, { useRefPrice: false }).map(
        ({ id, score }) => [id, score],
      );
    assert.deepEqual(signature(db), signature(withoutPrices));
  }
});

test("外部资料链接只接受 HTTP(S)，并转义属性文本", () => {
  assert.equal(
    sourceHref("https://example.com/?a=1&b=2"),
    "https://example.com/?a=1&amp;b=2",
  );
  for (const value of [
    "",
    "file:///example",
    "data:text/plain,example",
    "/relative",
  ])
    assert.equal(sourceHref(value), "#");
});
