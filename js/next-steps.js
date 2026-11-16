import { resolveBoard } from "./compatibility.js";
export function nextSteps(config, catalog, type = "all") {
  const steps = [];
  const add = (target, title, detail) => steps.push({ target, title, detail });
  const cpu = catalog.cpus.find((c) => c.id === config.cpu),
    board = resolveBoard(config, catalog);
  const socket = board?.socket || config.boardSocket;
  if (socket && socket !== cpu?.socket)
    add(
      "board",
      "先修正主板插槽",
      `当前主板与CPU插槽不同，更换散热器无法解决。`,
    );
  else if (!board)
    add(
      "board",
      "确认主板完整型号",
      "型号后缀、修订号及BIOS支持仍需核对；插槽相同不代表避让兼容。",
    );
  if (config.thermalInterface === "missing")
    add(
      "thermal-interface",
      "先安装适用导热介质",
      "按散热器说明完成安装，再做负载测试。",
    );
  if (type !== "aio" && !config.caseHeight)
    add(
      "case-height",
      "补充机箱风冷限高",
      "填写机箱标注的CPU散热器限高，不能使用机箱宽度。",
    );
  if (type !== "aio" && !config.ramHeight)
    add(
      "ram-height",
      "核对内存高度",
      "考察覆盖内存插槽的风冷时，需要同时核对风扇抬高后的总高度。",
    );
  if (
    type !== "air" &&
    (config.radiatorSize === null ||
      !config.radiatorSpace ||
      !config.radiatorFit ||
      !config.headers)
  )
    add(
      "radiator-size",
      "完善水冷安装条件",
      "考察水冷时，核对安装位、总厚度、长宽孔位与接口。",
    );
  if (config.power === "unknown")
    add(
      "power",
      "核对CPU运行工况",
      "主板默认不一定是Intel默认；有实测持续功耗时可补充。",
    );
  if (config.thermalInterface === "unknown")
    add(
      "thermal-interface",
      "确认导热介质",
      "介质、接触与安装压力会影响温度，未知时不预测温度。",
    );
  return steps;
}
