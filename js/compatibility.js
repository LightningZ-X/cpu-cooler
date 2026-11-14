import { stackThickness } from "./benchmarks.js";

export function resolveBoard(config, catalog) {
  const direct = catalog.boards.find((board) => board.id === config.board);
  if (direct) return direct;
  if (config.board !== "custom" || !config.boardName) return null;
  const key = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return (
    catalog.boards.find((board) => key(board.name) === key(config.boardName)) ||
    null
  );
}

export function evaluate(cooler, config, catalog) {
  const cpu = catalog.cpus.find((item) => item.id === config.cpu);
  const board = resolveBoard(config, catalog);
  const checks = [];
  const add = (state, title, detail, source = null) =>
    checks.push({ state, title, detail, source });
  if (!cpu)
    return {
      status: "blocked",
      checks: [
        { state: "fail", title: "处理器", detail: "请选择已收录的处理器" },
      ],
      height: null,
    };
  const socket = board?.socket || config.boardSocket;
  if (!socket) add("unknown", "主板插槽", "主板插槽尚未确认");
  else if (socket !== cpu.socket)
    add(
      "fail",
      "主板插槽",
      `CPU 使用 ${cpu.socket}，主板为 ${socket}，无法搭配`,
    );
  else
    add(
      "pass",
      "主板插槽",
      `${socket} 与 CPU 插槽匹配；CPU 支持列表及 BIOS 版本仍需核对`,
    );
  if (cooler.sockets.includes(cpu.socket))
    add(
      "pass",
      "平台扣具",
      cooler.socketEvidence === "review"
        ? `原始评测已在 ${cpu.socket} 平台测试；随盒扣具版本仍需核对`
        : `当前官方规格支持 ${cpu.socket}；购买时核对随盒扣具版本`,
    );
  else
    add(
      "unknown",
      "平台扣具",
      `当前数据未确认 ${cpu.socket} 支持，需向厂商核对扣具`,
    );
  const pair = catalog.overrides.find(
    (item) => item.board === board?.id && item.cooler === cooler.id,
  );
  if (pair) add(pair.state, "主板安装干涉", pair.detail, pair.source);
  else
    add(
      "unknown",
      "主板安装干涉",
      "尚无该主板与散热器组合的适配记录，请核对 VRM、M.2 装甲、背板和 PCIe 空间",
    );
  let height = cooler.height ?? null;
  if (cooler.type === "air") {
    if (pair?.recheckRam)
      add(
        "unknown",
        "内存净空",
        "该组合须改变安装方向，内存与机箱边缘净空需重新核对",
      );
    else if (cooler.ramOverhang === false)
      add("pass", "内存净空", "该 Intel 平台不覆盖内存插槽");
    else if (!config.ramHeight || cooler.ramClearance == null)
      add(
        "unknown",
        "内存净空",
        cooler.ramClearance == null
          ? "该产品内存净空数据待核对"
          : "请填写内存实际高度",
      );
    else if (config.ramHeight > cooler.ramClearance) {
      if (cooler.ramLift) {
        const lift = config.ramHeight - cooler.ramClearance;
        height += lift;
        add(
          "conditional",
          "内存净空",
          `前风扇需抬高约 ${lift} mm，所需安装高度增至 ${height} mm`,
        );
      } else
        add(
          "fail",
          "内存净空",
          `内存 ${config.ramHeight} mm 超过净空 ${cooler.ramClearance} mm`,
        );
    } else
      add(
        "pass",
        "内存净空",
        `${config.ramHeight} mm ≤ ${cooler.ramClearance} mm`,
      );
    if (height === null)
      add(
        "unknown",
        "机箱限高",
        "整机安装高度缺少一手规格证据，暂不能判断是否容纳",
      );
    else if (!config.caseHeight)
      add("unknown", "机箱限高", "请填写机箱允许的 CPU 风冷散热器高度");
    else if (height > config.caseHeight)
      add(
        "fail",
        "机箱限高",
        `所需 ${height} mm，超过机箱 ${config.caseHeight} mm 限高`,
      );
    else if (
      pair?.recheckRam ||
      (cooler.ramOverhang !== false &&
        (!config.ramHeight || cooler.ramClearance == null))
    )
      add(
        "unknown",
        "机箱限高",
        `标称 ${height} mm 可容纳；内存与风扇调整未确认，实际总高待核对`,
      );
    else if (config.caseHeight - height < 3)
      add(
        "conditional",
        "机箱限高",
        `仅余 ${config.caseHeight - height} mm，请实测并核对制造公差`,
      );
    else
      add(
        "pass",
        "机箱限高",
        `${height} mm ≤ ${config.caseHeight} mm，余量 ${config.caseHeight - height} mm`,
      );
  } else {
    if (config.radiatorSize === null)
      add("unknown", "冷排安装位", "请选择实际安装位置支持的冷排规格");
    else if (config.radiatorSize < cooler.radiatorSize)
      add(
        "fail",
        "冷排安装位",
        config.radiatorSize === 0
          ? "该机箱位置不支持水冷"
          : `所选安装位不支持 ${cooler.radiatorSize} mm 冷排`,
      );
    else
      add(
        "conditional",
        "冷排安装位",
        `标称规格满足；请核对 ${cooler.radiatorLength} × ${cooler.radiatorWidth} mm 本体及螺丝孔位`,
      );
    const total = stackThickness(cooler);
    if (!config.radiatorSpace)
      add("unknown", "冷排总厚度", `冷排与风扇共 ${total} mm，请填写可用空间`);
    else if (config.radiatorSpace < total)
      add(
        "fail",
        "冷排总厚度",
        `需要 ${total} mm，可用空间仅 ${config.radiatorSpace} mm`,
      );
    else if (config.radiatorSpace - total < 3)
      add(
        "conditional",
        "冷排总厚度",
        `需要 ${total} mm，空间余量不足 3 mm，需实测`,
      );
    else add("pass", "冷排总厚度", `${total} mm ≤ ${config.radiatorSpace} mm`);
    add(
      config.radiatorFit ? "pass" : "unknown",
      "冷排周边空间",
      config.radiatorFit
        ? "你已确认该位置的长宽、干涉和管路空间"
        : "需核对顶置主板/内存干涉，或前置显卡长度及管路空间",
    );
  }
  add(
    config.headers ? "pass" : "unknown",
    "供电与控制接口",
    config.headers
      ? "你已确认接口与连接方式"
      : "请按主板和散热器说明书确认风扇/水泵接口与连接方式",
  );
  const status = checks.some((c) => c.state === "fail")
    ? "blocked"
    : checks.some((c) => c.state === "unknown")
      ? "pending"
      : checks.some((c) => c.state === "conditional")
        ? "conditional"
        : "compatible";
  return { status, checks, heightUsed: height };
}

export function precheck(config, catalog) {
  const cpu = catalog.cpus.find((c) => c.id === config.cpu);
  const socket = resolveBoard(config, catalog)?.socket || config.boardSocket;
  return [
    {
      state: !socket ? "unknown" : socket === cpu?.socket ? "pass" : "fail",
      title: "CPU / 主板",
      detail: !socket
        ? "主板插槽待填写"
        : socket === cpu?.socket
          ? `${socket} 插槽匹配`
          : "CPU 与主板插槽冲突",
    },
    {
      state: config.caseHeight ? "pass" : "unknown",
      title: "机箱空间",
      detail: config.caseHeight
        ? `已填风冷限高 ${config.caseHeight} mm`
        : "限高未填写",
    },
    {
      state: config.ramHeight ? "pass" : "unknown",
      title: "内存尺寸",
      detail: config.ramHeight
        ? `已填高度 ${config.ramHeight} mm`
        : "内存高度未填写",
    },
  ];
}
