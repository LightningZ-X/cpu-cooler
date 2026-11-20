import { evaluate } from "./compatibility.js";
import { benchmarkResult, matchingBenchmark } from "./benchmarks.js";
import { stackThickness } from "./benchmarks.js";
import { thermalContext } from "./thermal-context.js";

export const statusText = {
  compatible: "已知检查通过",
  conditional: "有条件兼容",
  pending: "待确认",
  blocked: "不兼容",
};

function buildReasons(cooler, context, config, measured, price, useRefPrice) {
  const reasons = [];
  if (cooler.formFactor === "downdraft") {
    reasons.push(
      context.highDemand
        ? `超薄下压方案（${cooler.height} mm），持续高负载散热余量有限，需搭配限制功耗或强风道`
        : `${cooler.height} mm 超薄下压设计，专用于 A4 / 紧凑 ITX 机箱`,
    );
  } else if (cooler.type === "aio") {
    const total = stackThickness(cooler);
    reasons.push(
      context.highDemand
        ? `${cooler.radiatorSize} mm 水冷（总厚 ${total} mm），请核对持续高负载实测和安装空间`
        : `${cooler.radiatorSize} mm 水冷备选（总厚 ${total} mm），请核对安装空间与实测表现`,
    );
  } else if (context.highDemand) {
    reasons.push(
      `塔式风冷（高 ${cooler.height ?? "待核"} mm），持续高负载下需核对实测表现或设功耗墙`,
    );
  } else if (cooler.height && cooler.height < 150) {
    reasons.push(`${cooler.height} mm 矮塔方案，主要面向限高偏紧的小型机箱`);
  } else if (cooler.tier === "dual" || cooler.tier === "large") {
    reasons.push(
      `塔式风冷（高 ${cooler.height ?? "待核"} mm），按同条件实测考察多核负载表现`,
    );
  } else {
    reasons.push(
      `塔式风冷（高 ${cooler.height ?? "待核"} mm），请核对内存和机箱限高`,
    );
  }

  if (config.preference === "quiet") {
    reasons.push(
      cooler.type === "air"
        ? "风冷结构简洁、无水泵噪声；实际静音表现取决于负载与风扇曲线"
        : "包含水泵运转声源，请结合实测曲线选择",
    );
  }
  if (cooler.ramOverhang === false) {
    reasons.push("默认布局不遮挡内存插槽，适合高马甲灯条");
  } else if (cooler.ramClearance != null) {
    reasons.push(
      `标称内存净空 ${cooler.ramClearance} mm${cooler.ramLift ? "，高条可通过抬高前风扇避让" : "，超限条须核对"}`,
    );
  }
  if (/digital|nyx|cc90/i.test(cooler.name)) {
    reasons.push("自带顶盖数显，需预留主板 USB 2.0 接针");
  }
  if (useRefPrice && cooler.refPrice && !price) {
    reasons.push(
      `参考估价 ¥${cooler.refPrice[0]}–${cooler.refPrice[1]}，实际到手价需另查`,
    );
  }
  if (measured) {
    reasons.unshift(
      `${measured.author} 同 CPU / 功耗参考：${measured.value}${measured.unit}；仅代表该组测试，不预测你的整机温度`,
    );
  }
  return reasons;
}

export function recommend(
  config,
  catalog,
  prices = {},
  { useRefPrice = true } = {},
) {
  const cpu = catalog.cpus.find((c) => c.id === config.cpu);
  const context = thermalContext(config, cpu);
  const group = matchingBenchmark(config, catalog);
  const testedCount =
    group?.results.filter(
      (row) =>
        row.coolerId && catalog.coolers.some((c) => c.id === row.coolerId),
    ).length || 0;
  return catalog.coolers
    .map((cooler) => {
      const fit = evaluate(cooler, config, catalog);
      let score = 0;
      if (context.highDemand) {
        score +=
          {
            aio360: 40,
            aio240: 25,
            large: 20,
            dual: 12,
            compact: 2,
            lowprofile: -18,
          }[cooler.tier] ?? 0;
        if (cooler.type === "aio" && cooler.radiatorThickness >= 38) score += 4;
      } else {
        score +=
          {
            aio360: 10,
            aio240: 14,
            large: 22,
            dual: 30,
            compact: 28,
            lowprofile: 12,
          }[cooler.tier] ?? 0;
        if (config.caseHeight && config.caseHeight <= 110) {
          if (cooler.tier === "lowprofile") score += 35;
        } else if (config.caseHeight && config.caseHeight < 154) {
          if (cooler.type === "air" && cooler.height && cooler.height < 150)
            score += 14;
        } else {
          if (cooler.type === "air" && cooler.height >= 150) {
            if (cooler.tier === "dual") score += 8;
            if (cooler.tier === "compact")
              score += context.watts <= 140 ? 8 : 3;
          } else if (
            cooler.type === "air" &&
            cooler.height &&
            cooler.height < 110
          ) {
            score -= 12;
          } else if (
            cooler.type === "air" &&
            cooler.height &&
            cooler.height < 148
          ) {
            score -= 4;
          }
        }
      }
      if (config.preference === "quiet") {
        score += cooler.type === "air" ? 15 : 0;
      }
      if (config.preference === "performance") {
        score +=
          {
            aio360: 18,
            aio240: 10,
            large: 12,
            dual: 6,
            compact: 0,
            lowprofile: -6,
          }[cooler.tier] ?? 0;
      }
      if (cooler.ramOverhang === false) {
        score += 4;
      }
      if (fit.checks.find((k) => k.title === "平台扣具")?.state === "unknown") {
        score -= 12;
      }
      if (context.amd && cooler.amdContact?.recommended === false) score -= 12;
      const price =
        Number(prices[cooler.id]) > 0 ? Number(prices[cooler.id]) : null;
      const midRef =
        Array.isArray(cooler.refPrice) && cooler.refPrice.length >= 2
          ? (cooler.refPrice[0] + cooler.refPrice[1]) / 2
          : null;
      if (config.preference === "value" && price) {
        score += Math.max(0, 20 - price / 100);
      } else if (useRefPrice && !price && midRef) {
        if (config.preference === "balanced")
          score += Math.max(0, Math.round(6 - midRef / 140));
        if (config.preference === "value")
          score += Math.max(0, Math.round(18 - midRef / 60));
      }
      const overBudget = Boolean(
        config.budget && price && price > config.budget,
      );
      const overRefBudget = Boolean(
        config.budget &&
          !price &&
          cooler.refPrice &&
          cooler.refPrice[0] > config.budget,
      );
      const measured = benchmarkResult(cooler.id, config, catalog);
      const amdHints = [];
      if (context.amd && fit.status !== "blocked" && cooler.sockets.includes("AM5")) {
        if (cooler.amdContact)
          amdHints.push({
            ...cooler.amdContact,
            title: cooler.amdContact.recommended === false ? "厂商不推荐用于 AM5" : "AM5 底座接触",
          });
        if (cooler.amdOffset && (cpu.ccdCount > 0 || cooler.amdOffset.mode === "built-in"))
          amdHints.push({
            ...cooler.amdOffset,
            title: cooler.amdOffset.mode === "built-in"
              ? "AM5 偏移安装"
              : "AM5 可选偏移扣具",
          });
      }
      const reasons = buildReasons(
        cooler,
        context,
        config,
        measured,
        price,
        useRefPrice,
      );
      return {
        ...cooler,
        ...fit,
        price,
        refPrice: cooler.refPrice || null,
        effectivePrice: price ?? (midRef ? Math.round(midRef) : null),
        overBudget,
        overRefBudget,
        score,
        reasons,
        amdHints,
        measured,
        measuredPriority:
          testedCount >= 2 && config.preference !== "value" && !!measured,
      };
    })
    .sort(
      (a, b) =>
        (a.status === "blocked") - (b.status === "blocked") ||
        Number(a.overBudget) - Number(b.overBudget) ||
        Number(b.measuredPriority) - Number(a.measuredPriority) ||
        (a.measuredPriority && b.measuredPriority
          ? a.measured.value - b.measured.value
          : 0) ||
        (config.preference === "value" && a.price && b.price
          ? a.price - b.price
          : b.score - a.score),
    );
}
