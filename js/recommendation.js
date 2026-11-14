import { evaluate } from "./compatibility.js";

export const statusText = {
  compatible: "已知检查通过",
  conditional: "有条件兼容",
  pending: "待确认",
  blocked: "不兼容",
};

export function recommend(config, catalog, prices = {}) {
  const cpu = catalog.cpus.find((c) => c.id === config.cpu);
  const power =
    config.power === "limited" && config.powerLimit
      ? config.powerLimit
      : cpu?.turboPower;
  const heavy = config.usage === "production" && power > 200;
  return catalog.coolers
    .map((cooler) => {
      const fit = evaluate(cooler, config, catalog);
      let score = 0;
      const reasons = [];
      if (heavy || config.power === "unlimited") {
        score += { aio360: 40, large: 20, dual: 10, compact: 0 }[cooler.tier];
        reasons.push(
          cooler.type === "aio"
            ? "持续高负载：优先考察大冷排方案，最终表现需查看同平台测试"
            : "持续高负载下需核对实测表现，必要时限制功耗",
        );
      } else {
        score += { aio360: 10, large: 22, dual: 30, compact: 28 }[cooler.tier];
        reasons.push(
          cooler.type === "air"
            ? "当前用途可优先考察风冷，兼顾安装与维护"
            : "提供水冷备选，购买前确认安装空间",
        );
      }
      if (config.preference === "quiet") {
        score += cooler.type === "air" ? 15 : 0;
        reasons.push(
          cooler.type === "air"
            ? "风冷结构简洁、无需水泵；实际噪声取决于负载和风扇曲线"
            : "包含水泵噪声来源，请结合整机实测选择",
        );
      }
      if (config.preference === "performance")
        score += { aio360: 18, large: 12, dual: 5, compact: 0 }[cooler.tier];
      if (cooler.ramOverhang === false) {
        score += 4;
        reasons.push("不覆盖内存插槽，适合高马甲内存");
      }
      const price =
        Number(prices[cooler.id]) > 0 ? Number(prices[cooler.id]) : null;
      if (config.preference === "value" && price)
        score += Math.max(0, 20 - price / 100);
      const overBudget = Boolean(
        config.budget && price && price > config.budget,
      );
      return { ...cooler, ...fit, price, overBudget, score, reasons };
    })
    .sort(
      (a, b) =>
        (a.status === "blocked") - (b.status === "blocked") ||
        Number(a.overBudget) - Number(b.overBudget) ||
        (config.preference === "value" && a.price && b.price
          ? a.price - b.price
          : b.score - a.score),
    );
}
