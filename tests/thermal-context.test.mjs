import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { defaults, normalize } from "../js/storage.js";
import { powerLabel, thermalContext } from "../js/thermal-context.js";
import { recommend } from "../js/recommendation.js";
import { matchingBenchmark } from "../js/benchmarks.js";
const products = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
const { groups } = JSON.parse(
  await readFile(
    new URL("../data/reviews/benchmarks.json", import.meta.url),
    "utf8",
  ),
);
const db = { ...products, benchmarks: groups };
const cpu = db.cpus.find((c) => c.id === "14900kf");
const config = (extra = {}) => ({
  ...defaults,
  cpu: cpu.id,
  usage: "production",
  power: "intel",
  ...extra,
});

test("旧配置保持体质与介质未知，恶意枚举及越界功耗被拒绝", () => {
  const old = normalize({ cpu: cpu.id, power: "unlimited" }, db);
  assert.equal(old.power, "unlimited");
  assert.equal(old.silicon, "unknown");
  assert.equal(old.thermalInterface, "unknown");
  const invalid = normalize(
    { silicon: "perfect", thermalInterface: "magic", measuredPower: 601 },
    db,
  );
  assert.equal(invalid.measuredPower, null);
  assert.equal(invalid.silicon, "unknown");
  assert.equal(invalid.thermalInterface, "unknown");
  for (const power of ["overclock", "undervolt"]) {
    const selected = normalize(
      {
        power,
        measuredPower: 156.5,
        silicon: "hot",
        thermalInterface: "phase",
      },
      db,
    );
    assert.equal(selected.power, power);
    assert.equal(selected.measuredPower, 156.5);
    assert.equal(selected.silicon, "hot");
    assert.equal(selected.thermalInterface, "phase");
  }
});
test("默认包含睿频；主板默认、解锁与降压不伪造实测功耗", () => {
  for (const power of ["intel", "unknown", "unlimited", "undervolt"]) {
    const result = thermalContext(config({ power }), cpu);
    assert.equal(result.watts, cpu.turboPower);
    assert.equal(result.measured, false);
    assert.match(result.basis, /参考/);
  }
});
test("持续实测功耗影响考察规格，超频始终保留高负载余量", () => {
  assert.equal(
    thermalContext(config({ measuredPower: 120 }), cpu).highDemand,
    false,
  );
  assert.equal(
    thermalContext(config({ measuredPower: 260 }), cpu).highDemand,
    true,
  );
  assert.equal(
    thermalContext(config({ usage: "gaming", measuredPower: 260 }), cpu)
      .highDemand,
    true,
  );
  assert.equal(
    thermalContext(config({ power: "overclock", measuredPower: 120 }), cpu)
      .highDemand,
    true,
  );
  const score = (watts) =>
    recommend(config({ measuredPower: watts }), db).find((c) => c.id === "u12a")
      .score;
  assert.ok(score(120) > score(260));
  assert.match(
    thermalContext(
      config({ power: "limited", powerLimit: 100, measuredPower: 250 }),
      cpu,
    ).notes.join(" "),
    /高于所填上限/,
  );
});
test("自述体质与介质不提高标称瓦数、排名或机械兼容结论", () => {
  const baseline = recommend(config(), db).map(
    ({ id, status, score, construction }) => ({
      id,
      status,
      score,
      construction,
    }),
  );
  for (const silicon of ["efficient", "typical", "hot"])
    for (const thermalInterface of [
      "paste",
      "phase",
      "liquid",
      "missing",
      "degraded",
    ])
      assert.deepEqual(
        recommend(config({ silicon, thermalInterface }), db).map(
          ({ id, status, score, construction }) => ({
            id,
            status,
            score,
            construction,
          }),
        ),
        baseline,
      );
});
test("缺介质、液金与接触存疑给出具体核对条件", () => {
  for (const thermalInterface of ["liquid", "missing", "degraded", "sheet"])
    assert.equal(
      thermalContext(config({ thermalInterface }), cpu).attention,
      true,
    );
  assert.match(
    thermalContext(config({ thermalInterface: "liquid" }), cpu).interfaceNote,
    /铝/,
  );
  assert.match(
    thermalContext(config({ thermalInterface: "missing" }), cpu).interfaceNote,
    /再进行负载测试/,
  );
});
test("超频、降压和实测功耗不同的配置不继承标准测试排名", () => {
  const group = groups.find((g) => g.id === "gn-14900kf-250-25dba");
  const base = config({
    power: "limited",
    powerLimit: group.powerW,
    benchmarkId: group.id,
  });
  assert.ok(matchingBenchmark(base, db));
  assert.equal(matchingBenchmark({ ...base, measuredPower: 180 }, db), null);
  assert.ok(matchingBenchmark({ ...base, measuredPower: group.powerW }, db));
  for (const power of ["overclock", "undervolt", "unlimited"])
    assert.equal(matchingBenchmark({ ...base, power }, db), null);
});
test("新型号的安装干涉仍需逐组合证据", () => {
  const newBoards = db.boards.filter((b) => b.checkedAt === "2026-11-16");
  assert.ok(newBoards.length >= 8);
  for (const board of newBoards)
    for (const cooler of recommend(config({ board: board.id }), db))
      if (
        !db.overrides.some(
          (o) => o.board === board.id && o.cooler === cooler.id,
        )
      )
        assert.equal(
          cooler.checks.find((c) => c.title === "主板安装干涉").state,
          "unknown",
        );
});

test("AM5 温控按精确型号、芯片布局和实测 Tctl/Tdie 解读", () => {
  const get = (id, extra) => {
    const settings = normalize(config({ cpu: id, ...extra }), db);
    return thermalContext(settings, db.cpus.find((item) => item.id === id));
  };
  assert.match(get("7800x3d", { packageTemp: "90" }).amd.summary, /89 °C.*达到或超过/);
  assert.match(get("9800x3d", { packageTemp: 90 }).amd.summary, /95 °C.*距 Tjmax 5 °C/);
  assert.match(get("9950x3d", {}).amd.summary, /双 CCD/);
  assert.match(get("8700g", {}).amd.summary, /单片 APU/);
  assert.equal(get("9950x3d2", {}).watts, null);
  assert.match(get("9950x3d2", {}).basis, /PPT 待核对/);
  assert.equal(get("9950x3d2", { measuredPower: 190 }).watts, 190);
  assert.equal(get("9700x", { power: "unlimited", measuredPower: 88 }).highDemand, false);
  assert.equal(get(cpu.id, { packageTemp: 90 }).amd, null);
  assert.equal(normalize({ cpu: "7800x3d", packageTemp: "" }, db).packageTemp, null);
  assert.equal(normalize({ cpu: "7800x3d", packageTemp: 121 }, db).packageTemp, null);
  assert.equal(normalize({ cpu: cpu.id, packageTemp: 90 }, db).packageTemp, null);
  assert.equal(powerLabel("intel", db.cpus.find((c) => c.id === "7800x3d")), "AMD 原厂默认（PPT）");
});

test("按 AM5 底座和扣具证据出提示，主板干涉与版本限制独立判断", () => {
  const candidate = (id, extra) => recommend(
    config({ cpu: "9850x3d", board: "msi-b850i-edge", caseHeight: 175, ramHeight: 32, ...extra }),
    db,
  ).find((item) => item.id === id);
  const lbc = candidate("d15g2lbc");
  assert.equal(lbc.checks.find((check) => check.title === "主板安装干涉").state, "conditional");
  assert.ok(lbc.amdHints.some((hint) => hint.mode === "optional" && hint.mm === 7));
  const hbc = candidate("d15g2hbc");
  assert.equal(hbc.checks.find((check) => check.title === "平台扣具").state, "pass");
  assert.ok(hbc.amdHints.some((hint) => hint.recommended === false));
  assert.ok(hbc.score < lbc.score);
  assert.deepEqual(candidate("d15g2", { cpu: "8700g" }).amdHints, []);
  assert.ok(candidate("lf3360", { cpu: "8700g" }).amdHints.some((hint) => hint.mode === "built-in"));
  assert.equal(candidate("v8ace-amd", { cpu: cpu.id, board: "tuf-z890" }).status, "blocked");
  assert.notEqual(candidate("v8ace-amd", {}).status, "blocked");
});
