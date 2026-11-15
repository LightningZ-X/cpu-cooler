import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { constructionSummary, recordedTests } from "../js/product-specs.js";
import { recommend } from "../js/recommendation.js";
import { defaults } from "../js/storage.js";
const db = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
db.benchmarks = JSON.parse(
  await readFile(
    new URL("../data/reviews/benchmarks.json", import.meta.url),
    "utf8",
  ),
).groups;
const c = (id) => db.coolers.find((c) => c.id === id);
test("redux 穿Fin与焊接型号独立，Soldered不擅自翻译成回流焊", () => {
  assert.equal(c("u12sredux").construction.finJoint.method, "press-fit");
  assert.match(constructionSummary(c("u12sredux")).finJoint, /穿 Fin/);
  assert.match(constructionSummary(c("u12a")).finJoint, /未注明回流/);
  assert.equal(c("ps120se").construction.finJoint.method, "unknown");
});
test("NSPR与热管Q-Max不变成整机解热W，水冷热管显示不适用", () => {
  assert.equal(c("u12a").construction.thermalRating.watts, null);
  assert.equal(c("v8ace-intel").construction.thermalRating.watts, 300);
  assert.match(c("v8ace-intel").construction.thermalRating.detail, /90/);
  assert.match(constructionSummary(c("lf3360")).heatpipes, /不适用/);
  assert.match(constructionSummary(c("cq125")).heatpipes, /待核对/);
});
test("标称瓦数及连接工艺不改变推荐排序或兼容性", () => {
  const config = { ...defaults, cpu: "245k", board: "tuf-z890" };
  const mutated = {
    ...db,
    coolers: db.coolers.map((c) => ({
      ...c,
      construction: {
        finJoint: { method: "reflow" },
        thermalRating: { watts: 9999 },
      },
    })),
  };
  assert.deepEqual(
    recommend(config, db).map((c) => [c.id, c.score, c.status]),
    recommend(config, mutated).map((c) => [c.id, c.score, c.status]),
  );
});
test("已录入测试负载只取精确版本，不推断最大解热能力", () => {
  assert.equal(recordedTests("ak400digitalpro", db).length, 0);
  assert.ok(
    recordedTests("v8ace-intel", db).some((t) => t.group.powerW === 280),
  );
  assert.equal(
    recordedTests("d15g2", db).some(
      (t) => t.group.id === "gn-14900kf-250-25dba",
    ),
    false,
  );
});
test("产品图片本地可发布，来源齐全，工艺和功耗正值有出处", async () => {
  for (const cooler of db.coolers) {
    const e = cooler.construction;
    assert.ok(e && e.checkedAt);
    for (const f of ["heatpipes", "finJoint", "thermalRating"]) {
      const d = e[f];
      if (
        d.count > 0 ||
        d.watts > 0 ||
        ["soldered", "press-fit", "reflow"].includes(d.method)
      )
        assert.match(d.source, /^https:\/\//);
    }
    if (cooler.image) {
      assert.match(cooler.image.path, /^assets\/products\/[a-z0-9-]+\.webp$/);
      const bytes = await readFile(
        new URL("../" + cooler.image.path, import.meta.url),
      );
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      assert.ok(
        (await stat(new URL("../" + cooler.image.path, import.meta.url))).size <
          200000,
      );
      assert.match(cooler.image.source, /^https:\/\//);
    }
  }
});
