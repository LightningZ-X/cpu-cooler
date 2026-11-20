import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile, readdir, stat } from "node:fs/promises";
import {
  matchingBenchmark,
  metricLabel,
  benchmarkOptions,
  benchmarkApplyHref,
} from "../js/benchmarks.js";
import { evaluate } from "../js/compatibility.js";
import { recommend } from "../js/recommendation.js";
import { resultView } from "../js/results-view.js";
import { cardSpecItems } from "../js/product-specs.js";
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
const byId = (id) => db.coolers.find((c) => c.id === id);

test("AM5 处理器与 AM5 主板插槽匹配，与 LGA1851 冲突，Intel 专用散热器不误判扣具通过", () => {
  const am5Ok = evaluate(
    byId("ps120se"),
    { ...defaults, cpu: "9800x3d", board: "tuf-b850m" },
    db,
  );
  assert.equal(am5Ok.checks.find((c) => c.title === "主板插槽").state, "pass");
  assert.equal(am5Ok.checks.find((c) => c.title === "平台扣具").state, "pass");

  const mismatch = evaluate(
    byId("ps120se"),
    { ...defaults, cpu: "9800x3d", board: "tuf-z890" },
    db,
  );
  assert.equal(mismatch.status, "blocked");
  assert.equal(mismatch.fitStage, "blocked");

  for (const intelId of ["v8ace-intel", "nh-l9i-17xx"]) {
    const res = evaluate(
      byId(intelId),
      { ...defaults, cpu: "9800x3d", board: "tuf-b850m" },
      db,
    );
    assert.equal(
      res.checks.find((c) => c.title === "平台扣具").state,
      "fail",
      intelId,
    );
  }
  const unknown = evaluate(byId("cq125"), { ...defaults, cpu: "9800x3d" }, db);
  assert.equal(unknown.checks.find((c) => c.title === "平台扣具").state, "unknown");
});

test("55mm 超薄 ITX 机箱优先推荐超薄下压风冷，余量小于3mm触发提醒，超高塔式被排除", () => {
  const am5List55 = recommend(
    {
      ...defaults,
      cpu: "9700x",
      board: "strix-b650ei",
      caseHeight: 55,
      ramHeight: 33,
    },
    db,
  );
  assert.equal(am5List55.find((c) => c.id === "axp90-x47-full").fitStage, "dimensions-ok");
  assert.equal(am5List55.find((c) => c.id === "axp90-x53-full").fitStage, "conditional");
  assert.deepEqual(
    am5List55
      .filter((c) => c.type === "air" && c.status !== "blocked")
      .slice(0, 2)
      .map((c) => c.id),
    ["axp90-x47-full", "axp90-x53-full"],
  );
  assert.equal(am5List55.find((c) => c.id === "ps120se").status, "blocked");
  assert.equal(am5List55.find((c) => c.id === "nh-l12s").status, "blocked");

  const am5List56 = recommend(
    {
      ...defaults,
      cpu: "9700x",
      board: "strix-b650ei",
      caseHeight: 56,
      ramHeight: 33,
    },
    db,
  );
  assert.deepEqual(
    am5List56
      .filter((c) => c.type === "air" && c.fitStage === "dimensions-ok")
      .map((c) => c.id),
    ["axp90-x47-full", "axp90-x53-full", "nh-l9a-am5"],
  );

  const intelList = recommend(
    {
      ...defaults,
      cpu: "245k",
      board: "tuf-z890",
      caseHeight: 56,
      ramHeight: 33,
    },
    db,
  );
  const intelReadyIds = intelList
    .filter((c) => c.type === "air" && c.fitStage === "dimensions-ok")
    .map((c) => c.id);
  assert.ok(intelReadyIds.includes("nh-l9i-17xx"));
  assert.ok(intelReadyIds.includes("axp90-x47-full"));
  assert.ok(intelReadyIds.includes("axp90-x53-full"));
});

test("默认 245K 均衡装机主流双塔排在昂贵小塔 D12L 之前且推荐理由差异化", () => {
  const list = recommend({ ...defaults, cpu: "245k" }, db);
  const idxPs120 = list.findIndex((c) => c.id === "ps120se");
  const idxPa120 = list.findIndex((c) => c.id === "pa120se");
  const idxD12l = list.findIndex((c) => c.id === "d12l");
  assert.ok(idxPs120 >= 0 && idxPs120 < idxD12l);
  assert.ok(idxPa120 >= 0 && idxPa120 < idxD12l);

  const topAirReasons = new Set(
    list
      .filter((c) => c.type === "air")
      .slice(0, 6)
      .map((c) => c.reasons[0]),
  );
  assert.ok(topAirReasons.size >= 2);
});

test("填齐主板与尺寸参数后给出正向空间匹配状态，同时保持未逐板认证的严谨性", () => {
  const cfg = {
    ...defaults,
    cpu: "245k",
    board: "tuf-z890",
    caseHeight: 180,
    ramHeight: 33,
  };
  const u12a = evaluate(byId("u12a"), cfg, db);
  assert.equal(u12a.fitStage, "dimensions-ok");
  assert.equal(u12a.fitLabel, "尺寸与插槽匹配");
  assert.equal(u12a.status, "pending");

  const ps120se = evaluate(byId("ps120se"), cfg, db);
  assert.equal(ps120se.fitStage, "nominal-ok");
  assert.match(ps120se.fitLabel, /净空待核/);
  assert.equal(ps120se.status, "pending");
});

test("卡片正面核心规格条区分风冷与水冷，不再显示不适用", () => {
  const aioSpecs = cardSpecItems(byId("lf3360"), { spaceMargin: 12 });
  const airSpecs = cardSpecItems(byId("ps120se"), {
    heightUsed: 154,
    spaceMargin: 26,
  });
  assert.equal(aioSpecs.length, 3);
  assert.equal(airSpecs.length, 3);
  for (const item of [...aioSpecs, ...airSpecs]) {
    assert.doesNotMatch(item.value, /不适用/);
  }
  assert.match(aioSpecs[1].value, /63 mm/);
});

test("开启参考价估算时可开箱按预算筛除高价型号并按参考价排序", () => {
  const rows = recommend({ ...defaults, cpu: "245k", budget: 200 }, db, {});
  const view = resultView(rows, {
    useRefPrice: true,
    sort: "price",
  });
  assert.ok(!view.eligible.some((c) => c.id === "d15g2"));
  assert.ok(view.eligible.some((c) => c.id === "pa120se"));
  assert.equal(view.eligible.find((c) => c.id === "d15g2lbc")?.effectivePrice, null);
  for (let i = 1; i < view.eligible.length; i++) {
    assert.ok(
      (view.eligible[i - 1].effectivePrice ?? Infinity) <=
      (view.eligible[i].effectivePrice ?? Infinity),
    );
  }
});

test("CSS 无外部 url 引用且构建产物锁定微星闪电黄配色与 HUD 动效逻辑", async () => {
  const cssDir = new URL("../css/", import.meta.url);
  for (const file of await readdir(cssDir)) {
    if (!file.endsWith(".css")) continue;
    const css = await readFile(new URL(file, cssDir), "utf8");
    assert.doesNotMatch(css, /url\(\s*["']?(?!data:|#)/i, file);
  }
  for (const scriptFile of [
    "../js/generated/app.js",
    "../js/generated/reviews.js",
  ]) {
    const code = await readFile(new URL(scriptFile, import.meta.url), "utf8");
    assert.doesNotThrow(() => new vm.Script(code), scriptFile);
    assert.match(code, /gliderReady/);
    assert.match(code, /data-scanning/);
    assert.match(code, /dataset\.rolling/);
    assert.match(code, /data-lightning-pulse/);
    assert.doesNotMatch(code, /aura-accent/);
    assert.doesNotMatch(code, /data-aura/);
  }
  const offline = await readFile(
    new URL("../dist/散热器选择指南.html", import.meta.url),
    "utf8",
  );
  assert.match(offline, /#e9c45b/);
  assert.match(offline, /--lightning-glow/);
  assert.match(offline, /data-rolling/);
  assert.doesNotMatch(offline, /aura-accent/);
  assert.doesNotMatch(offline, /data-aura="rog"/);
});

test("顶栏更多菜单不参与高度裁切且关闭光效与 Pages 瘦身配置生效", async () => {
  const indexHtml = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const reviewsHtml = await readFile(
    new URL("../reviews.html", import.meta.url),
    "utf8",
  );
  for (const [name, html] of [
    ["index.html", indexHtml],
    ["reviews.html", reviewsHtml],
  ]) {
    assert.match(
      html,
      /<link[^>]+type="image\/svg\+xml"[^>]+href="assets\/lightning-gold-icon\.svg"/,
      name,
    );
    assert.match(html, /class="site-options"/, name);
    assert.match(html, /id="light-effects"/, name);
  }
  const themeCss = await readFile(
    new URL("../css/theme.css", import.meta.url),
    "utf8",
  );
  assert.match(themeCss, /:root\[data-light-effects="off"\]\s+\.site-lighting/);
  assert.match(
    themeCss,
    /:root:not\(\[data-light-effects="off"\]\)[\s\S]*?\[data-spotlight-active="true"\]/,
  );
  assert.doesNotMatch(
    themeCss,
    /\.diagnostic-bar::before,\s*\.diagnostic-bar::after\s*\{\s*display:\s*none;\s*\}/,
  );
  assert.match(themeCss, /\.diagnostic-bar::before\s*\{\s*display:\s*none;\s*\}/);
  for (const scriptFile of [
    "../js/generated/app.js",
    "../js/generated/reviews.js",
  ]) {
    const code = await readFile(new URL(scriptFile, import.meta.url), "utf8");
    assert.match(code, /matches\("\.site-options"\)/, scriptFile);
    assert.match(code, /lightEffects === "off"/, scriptFile);
  }
  const pagesYml = await readFile(
    new URL("../.github/workflows/pages.yml", import.meta.url),
    "utf8",
  );
  assert.match(pagesYml, /rm -f public\/assets\/lightningz-gap-cut-v2\.mp4/);
  assert.match(pagesYml, /lightningz-gap-cut-gold\.mp4/);
});

test("AM5 GamersNexus 实测组仅在精确 CPU 与功耗条件下命中且严禁跨版本继承", () => {
  const cfg9800 = {
    ...defaults,
    cpu: "9800x3d",
    board: "strix-b650ei",
    power: "limited",
    powerLimit: 157,
    usage: "production",
    benchmarkId: "gn-9800x3d-157-25dba",
    radiatorSize: 360,
    radiatorSpace: 80,
    radiatorFit: true,
    caseHeight: 185,
    ramHeight: 33,
  };
  const group9800 = matchingBenchmark(cfg9800, db);
  assert.ok(group9800);
  assert.equal(metricLabel(group9800), "Tdie 平均温差（相对室温）");

  const cfg9950 = {
    ...cfg9800,
    cpu: "9950x3d",
    powerLimit: 276,
    benchmarkId: "gn-9950x3d-276-25dba",
  };
  const group9950 = matchingBenchmark(cfg9950, db);
  assert.ok(group9950);
  assert.equal(metricLabel(group9950), "Tdie 平均温差（相对室温）");
  assert.equal(matchingBenchmark({ ...cfg9800, powerLimit: 120 }, db), null);

  const rows9800 = recommend(cfg9800, db);
  assert.equal(rows9800.find((c) => c.id === "pa120se").measured, null);
  assert.equal(rows9800.find((c) => c.id === "fp240-black-argb").measured, null);
  const idxLf3360 = rows9800.findIndex((c) => c.id === "lf3360");
  const idxD15Lbc = rows9800.findIndex((c) => c.id === "d15g2lbc");
  assert.ok(idxLf3360 >= 0 && idxD15Lbc > idxLf3360);
});

test("ARCTIC AM5 官方逐板兼容记录精确生效，非 ICE 版保持未验证", () => {
  for (const board of ["strix-x870ee", "strix-b850i"]) {
    for (const coolerId of ["lf3360", "lf3pro360"]) {
      const check = evaluate(
        byId(coolerId),
        { ...defaults, cpu: "9800x3d", board },
        db,
      ).checks.find((c) => c.title === "主板安装干涉");
      assert.equal(check.state, "conditional", `${board}/${coolerId}`);
      assert.match(check.detail, /M\.2_1/);
    }
  }
  for (const board of ["strix-b650ei", "msi-b850-tomahawk"]) {
    const check = evaluate(
      byId("lf3360"),
      { ...defaults, cpu: "9800x3d", board },
      db,
    ).checks.find((c) => c.title === "主板安装干涉");
    assert.equal(check.state, "pass", board);
  }
  const nonIceCheck = evaluate(
    byId("lf3360"),
    { ...defaults, cpu: "9800x3d", board: "b850m-aorus-elite-wifi6e" },
    db,
  ).checks.find((c) => c.title === "主板安装干涉");
  assert.equal(nonIceCheck.state, "unknown");
});

test("一手官方内存净空与零遮挡结论仅应用于有据型号，PS120SE 保持保守未知", () => {
  for (const id of ["hyper212pro", "ak500s-digital", "ak700-digital-nyx"]) {
    const check = evaluate(
      byId(id),
      { ...defaults, cpu: "9800x3d", board: "tuf-b850m", ramHeight: null },
      db,
    ).checks.find((c) => c.title === "内存净空");
    assert.equal(check.state, "pass", id);
  }
  const f36Pass = evaluate(
    byId("freezer36black"),
    { ...defaults, cpu: "9800x3d", board: "tuf-b850m", ramHeight: 43 },
    db,
  ).checks.find((c) => c.title === "内存净空");
  assert.equal(f36Pass.state, "pass");

  const f36Fail = evaluate(
    byId("freezer36black"),
    { ...defaults, cpu: "9800x3d", board: "tuf-b850m", ramHeight: 44 },
    db,
  ).checks.find((c) => c.title === "内存净空");
  assert.equal(f36Fail.state, "fail");

  const ps120 = evaluate(
    byId("ps120se"),
    {
      ...defaults,
      cpu: "9800x3d",
      board: "tuf-b850m",
      caseHeight: 180,
      ramHeight: 33,
    },
    db,
  );
  assert.equal(ps120.checks.find((c) => c.title === "内存净空").state, "unknown");
  assert.equal(ps120.fitStage, "nominal-ok");
});

test("B 阶段官方产品图覆盖率提升至 41/43 且 reviews 产物支持三态徽章与动态计数", async () => {
  assert.ok(db.coolers.filter((c) => c.image).length >= 41);
  const reviewsBundle = await readFile(
    new URL("../js/generated/reviews.js", import.meta.url),
    "utf8",
  );
  assert.match(reviewsBundle, /官方确认兼容/);
  assert.doesNotMatch(reviewsBundle, /2 条 GamersNexus/);
});

test("C 阶段实测按插槽分组且资料库一键跳转可精确命中选型实测组", () => {
  const html = benchmarkOptions(db.benchmarks);
  assert.match(html, /<optgroup label="AMD AM5">/);
  assert.match(html, /<optgroup label="Intel LGA1851">/);
  assert.match(html, /<optgroup label="Intel LGA1700">/);
  for (const group of db.benchmarks) {
    assert.ok(html.includes(`value="${group.id}"`), group.id);
    const href = benchmarkApplyHref(group);
    assert.ok(href.startsWith("index.html#config="));
    const decoded = JSON.parse(decodeURIComponent(href.split("#config=")[1]));
    const normalized = normalize(decoded, db);
    assert.equal(matchingBenchmark(normalized, db)?.id, group.id);
  }
});

test("C 阶段离线单文件启用资源内容池去重并控制总体积", async () => {
  const offlinePath = new URL("../dist/散热器选择指南.html", import.meta.url);
  const offline = await readFile(offlinePath, "utf8");
  const { size } = await stat(offlinePath);
  assert.match(offline, /const _p=/);
  assert.ok(
    size < 4.25 * 1024 * 1024,
    `Expected deduped offline bundle < 4.25 MiB, got ${(size / 1024 / 1024).toFixed(2)} MiB`,
  );
  const inlineScripts = [...offline.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
  const dataAndAssetsScript = inlineScripts.find((s) =>
    s.startsWith("globalThis.COOLERGUIDE_DATA="),
  );
  assert.ok(dataAndAssetsScript);
  const sandbox = {};
  vm.runInNewContext(dataAndAssetsScript, sandbox);
  assert.equal(
    sandbox.COOLERGUIDE_ASSETS["assets/products/d15g2.webp"],
    sandbox.COOLERGUIDE_ASSETS["assets/products/d15g2lbc.webp"],
  );
  assert.equal(
    sandbox.COOLERGUIDE_ASSETS["assets/products/v8ace-intel.webp"],
    sandbox.COOLERGUIDE_ASSETS["assets/products/v8ace-amd.webp"],
  );
});

test("C 阶段资料库多维筛选与选型页对比弹窗维度完整打包", async () => {
  const reviewsHtml = await readFile(
    new URL("../reviews.html", import.meta.url),
    "utf8",
  );
  assert.match(reviewsHtml, /id="conflict-platform"/);
  assert.match(reviewsHtml, /id="conflict-state"/);
  assert.match(reviewsHtml, /id="conflict-count"/);

  const reviewsBundle = await readFile(
    new URL("../js/generated/reviews.js", import.meta.url),
    "utf8",
  );
  assert.match(reviewsBundle, /conflict-platform/);
  assert.match(reviewsBundle, /conflict-state/);
  assert.match(reviewsBundle, /benchmarkApplyHref/);

  const appBundle = await readFile(
    new URL("../js/generated/app.js", import.meta.url),
    "utf8",
  );
  assert.match(appBundle, /内存净空 \/ 避让/);
  assert.match(appBundle, /平台支持 \/ AM5 偏移/);
  assert.match(appBundle, /当前同条件实测/);
});
