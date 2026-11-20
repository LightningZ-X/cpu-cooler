export const powerLabels = {
  unknown: "主板默认 / 设置未知",
  intel: "Intel 默认功耗限制",
  limited: "手动限制功耗",
  unlimited: "解除功耗限制",
  overclock: "手动超频",
  undervolt: "降压优化（已验证稳定）",
};
export function powerLabel(power, cpu) {
  if (cpu?.socket === "AM5") {
    if (power === "intel") return "AMD 原厂默认（PPT）";
    if (power === "unlimited") return "PBO 放宽限制";
    if (power === "undervolt") return "降压 / 曲线优化（已验证稳定）";
  }
  return powerLabels[power];
}
export const siliconLabels = {
  unknown: "未评估 / 不确定",
  efficient: "同频所需电压较低（自行验证）",
  typical: "同频所需电压居中（自行验证）",
  hot: "同频所需电压较高（自行验证）",
};
export const interfaceLabels = {
  unknown: "未确认导热介质",
  paste: "常规导热硅脂",
  phase: "相变导热材料",
  liquid: "液态金属",
  sheet: "石墨 / 固态导热片",
  degraded: "旧介质 / 接触状态存疑",
  missing: "尚未安装导热介质",
};
export const thermalSources = [
  {
    title: "Intel：电压与功耗设置对温度的影响",
    url: "https://www.intel.com/content/www/us/en/support/articles/000059749/processors/intel-core-processors.html",
  },
  {
    title: "Noctua：导热介质效果与接触、压力和热负载有关",
    url: "https://www.noctua.at/en/expertise/tech/performance-comparison-nt-h1-vs-nt-h2",
  },
  {
    title: "Thermal Grizzly：液金材料适用条件",
    url: "https://www.thermal-grizzly.com/en/conductonaut/s-tg-c-005-r",
  },
  {
    title: "Intel：超频支持与稳定性验证",
    url: "https://www.intel.com/content/www/us/en/gaming/resources/overclocking-xtu-guide.html",
  },
];
const amdSources = [
  {
    title: "AMD：Ryzen 温度、功耗与动态加速",
    url: "https://community.amd.com/t5/gaming/ryzen-7000-series-processors-let-s-talk-about-power-temperature/ba-p/554629",
  },
  {
    title: "AMD Ryzen Master：PPT、PBO 与温度限制",
    url: "https://docs.amd.com/r/en-US/68886-ryzen-master-user-guide/CPU",
  },
  {
    title: "Noctua：AM5 CCD 热点与偏移安装",
    url: "https://www.noctua.at/en/expertise/tech/offset-am5-mounting-technical-backgrounds",
  },
];

export function thermalContext(config, cpu) {
  const isAmd = cpu?.socket === "AM5";
  const measured =
    Number.isFinite(config.measuredPower) && config.measuredPower > 0;
  const limited = config.power === "limited" && config.powerLimit > 0;
  const uncertain = ["unknown", "unlimited", "overclock", "undervolt"].includes(
    config.power,
  );
  const watts = measured
    ? config.measuredPower
    : limited
      ? config.powerLimit
      : cpu?.turboPower;
  const basis = measured
    ? "当前用途下实测持续 CPU Package Power"
    : limited
      ? "手动设置功耗上限（不等于实际功耗）"
      : isAmd
        ? watts == null
          ? "默认 PPT 待核对，建议填写 BIOS 上限或实测功耗"
          : "默认档 PPT 参考，以 BIOS 或监测为准"
        : "官方最大睿频功耗（选型参考）";
  const notes = [];
  if (config.power === "unknown")
    notes.push(
      isAmd
        ? "主板默认可能开启 PBO 或放宽功耗墙；请核对 BIOS 中的 PPT / 温度墙与曲线优化设置。"
        : "主板默认不一定采用 Intel 默认限制；请核对 BIOS 中的功耗、电压和增强模式。",
    );
  if (config.power === "intel")
    notes.push(
      isAmd
        ? "原厂默认包含 Precision Boost。默认档 PPT 仅作参考，实际负载受 BIOS、温度和电流限制。"
        : "Intel 默认仍包含睿频；基础功耗不是始终运行的功耗，也不是温度保证。",
    );
  if (config.power === "unlimited")
    notes.push(
      isAmd
        ? "PBO 放宽 PPT、TDC 或 EDC 后仍有上限。请填写当前用途的持续功耗，核对实际生效的限制。"
        : "解除功耗限制与手动超频分开记录；实际持续负载可能超出官方默认功耗上限。",
    );
  if (config.power === "overclock")
    notes.push(
      "手动超频需核对 CPU 与主板支持；频率、电压和负载决定实际发热，未实测时优先考察大规格方案。",
    );
  if (config.power === "undervolt")
    notes.push(
      "降压收益取决于芯片与稳定性验证；未填写实测功耗时，不自动降低散热规格。",
    );
  let amd = null;
  if (isAmd) {
    const layout = cpu.ccdCount === 0
      ? "单片 APU，优先看 CPU 与核显同时工作时的封装功耗"
      : cpu.ccdCount
        ? `${cpu.ccdCount === 1 ? "单" : "双"} CCD，局部热点受负载分布、底座接触和安装压力影响`
        : "芯片布局待核对，请结合实际封装功耗和温度判断";
    const limit = cpu.tjmax ? `官方 Tjmax ${cpu.tjmax} °C` : "官方温度上限待核对";
    const temperature = config.packageTemp;
    let reading = "";
    if (Number.isFinite(temperature) && cpu.tjmax) {
      const margin = Number((cpu.tjmax - temperature).toFixed(1));
      const status = margin > 0
        ? `距 Tjmax ${margin} °C。`
        : "已达到或超过 Tjmax。请结合有效频率、封装功耗和风扇转速判断。";
      reading = `实测 Tctl/Tdie ${temperature} °C，${status}`;
    }
    amd = { summary: `${layout}。${limit}。${reading}`, sources: amdSources };
    notes.push(
      "温度接近上限时，结合持续有效频率、封装功耗、散热器转速和安装接触判断，单看温度无法区分正常加速与散热受限。",
    );
    if (cpu.ccdCount > 0)
      notes.push("热点偏离顶盖中心。仅在有该型号厂商方案时考察偏移扣具，并重新核对显卡、M.2 和 VRM 净空。");
    if (cpu.x3d)
      notes.push("X3D 的缓存堆叠和温度上限会随代际变化。按具体 CPU 核对上限，避免用相同瓦数推算温度。");
    if (cpu.liquidRecommended)
      notes.push("AMD 对该型号建议水冷以获得最佳性能。按实际负载与机箱安装空间选择。");
  }
  if (measured)
    notes.push(
      "实测功耗仅代表填写时的负载；换用途、功耗设置或频率后请重新测量，不作为整机最高功耗。",
    );
  if (measured && limited && config.measuredPower > config.powerLimit)
    notes.push(
      "实测持续功耗高于所填上限，请核对限制是否生效、记录时段和功耗单位；当前按实测负载考察，不假定已限功耗成功。",
    );
  if (uncertain && !measured)
    notes.push(
      "该工况的实际功耗未知，官方数值只作参考，无法据此保证持续满载温度。",
    );
  if (config.silicon && config.silicon !== "unknown")
    notes.push(
      `${siliconLabels[config.silicon]}。体质为用户自述，只在同频、同负载与同稳定性标准下有比较意义；不按 SP 分数或“好体质”自动减瓦数。`,
    );
  else
    notes.push(
      "CPU 个体差异未评估；不能把另一颗同型号 CPU 的电压或温度直接套用。",
    );
  const medium = config.thermalInterface || "unknown";
  const interfaceStart = notes.length;
  if (medium === "unknown")
    notes.push("导热介质未确认：接触、涂布与安装压力需核对，暂不预测温度。");
  if (medium === "paste")
    notes.push(
      "硅脂效果取决于涂布、接触面和安装压力；换硅脂不自动折算固定温差。",
    );
  if (medium === "phase")
    notes.push(
      "相变材料按精确产品要求核对厚度、适用界面及热循环条件；不与普通厚导热垫混用。",
    );
  if (medium === "liquid")
    notes.push(
      "液态金属需核对电气绝缘与底座材料；Conductonaut 不适用于铝接触面。当前数据库不足以确认每款底座材质，必须逐型号核对。",
    );
  if (medium === "sheet")
    notes.push(
      "固态导热片需核对厚度、压紧要求与导电性；不能用普通导热垫厚度填充 CPU 与底座之间。",
    );
  if (medium === "degraded")
    notes.push(
      "先检查接触与介质状态、按说明重新安装，再判断是否需要更换更大散热器。",
    );
  if (medium === "missing")
    notes.push(
      "先按散热器说明安装适用导热介质，再进行负载测试。当前卡片仅供核对安装规格，不代表可以直接运行。",
    );
  notes.push("体质与介质不修改机械兼容结论，也不增加任何厂商标称解热瓦数。");
  return {
    watts,
    basis,
    measured,
    amd,
    highDemand:
      config.power === "overclock" ||
      (config.power === "unlimited" && (!isAmd || !measured)) ||
      (cpu?.liquidRecommended && !measured && !limited && config.usage === "production") ||
      (watts > 200 && (measured || config.usage === "production")),
    attention: ["liquid", "sheet", "degraded", "missing"].includes(medium),
    interfaceNote: notes[interfaceStart],
    notes,
  };
}
