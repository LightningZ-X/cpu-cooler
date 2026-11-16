import { constructionSummary, recordedTests } from "./product-specs.js";
import { modelMatches } from "./search.js";
import { resultView } from "./results-view.js";
import { setSectionVisible } from "./ui.js";
import { precheck, resolveBoard } from "./compatibility.js";
import {
  benchmarkTable,
  matchingBenchmark,
  stackThickness,
  metricLabel,
} from "./benchmarks.js";
import { recommend, statusText } from "./recommendation.js";
import { defaults, normalize, load, save } from "./storage.js";

const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const icon = (state) =>
  `<span class="status-icon ${state}" aria-hidden="true">${{ pass: "✓", fail: "×", unknown: "?", conditional: "!" }[state]}</span>`;
const form = $("#config-form");
let catalog,
  config,
  prices = {},
  filter = "all",
  results = [],
  compare = new Set();
let toastTimer;
let mode = "quick";
let modeInitialized = false;
function setMode(next) {
  mode = next === "full" ? "full" : "quick";
  if (modeInitialized) setSectionVisible($("#fit-fields"), mode === "full");
  else $("#fit-fields").hidden = mode === "quick";
  modeInitialized = true;
  document
    .querySelectorAll("[data-mode]")
    .forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode)),
    );
  $("#mode-note").textContent =
    mode === "quick"
      ? "先选 CPU 和用途，快速查看候选。已有安装参数仍参与检查；未填写的项目保持待确认。切到完整配置核对主板、内存与机箱。"
      : "补充主板与安装空间，逐项核对兼容条件。不知道的参数可以留空，已有的配置会保留。";
  try {
    localStorage.setItem("coolerguide-mode", mode);
  } catch {}
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 3500);
}
function dialog(title, body) {
  $("#dialog-title").textContent = title;
  $("#dialog-body").innerHTML = body;
  $("#info-dialog").showModal();
}
function persist() {
  return save({ config, prices });
}
function fillForm() {
  for (const [key, value] of Object.entries(config)) {
    const input = form.elements.namedItem(key);
    if (input) {
      if (input.type === "checkbox") input.checked = value;
      else input.value = value ?? "";
    }
  }
  updateMeta();
  validateForm();
}
function readForm() {
  updateMeta();
  if (!validateForm()) return false;
  const raw = Object.fromEntries(new FormData(form));
  raw.radiatorFit = $("#radiator-fit").checked;
  raw.headers = $("#headers").checked;
  raw.benchmarkId = config.benchmarkId;
  config = normalize(raw, catalog);
  if (location.hash.startsWith("#config="))
    history.replaceState(
      null,
      "",
      location.pathname +
        location.search +
        "#config=" +
        encodeURIComponent(JSON.stringify(config)),
    );
  return true;
}
function validateForm() {
  const invalid = [...form.elements].filter(
    (input) => input.willValidate && !input.validity.valid,
  );
  if (invalid.some((input) => input.closest("#fit-fields"))) {
    setMode("full");
    invalid.forEach((input) => {
      const details = input.closest("details");
      if (details) details.open = true;
    });
  }
  for (const input of form.elements) {
    if (input.willValidate && !input.validity.valid)
      input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }
  const message = invalid
    .map((input) => {
      const label = input.labels?.[0]?.textContent.trim() || "输入值";
      return input.type === "number" && input.min && input.max
        ? `${label}应为 ${input.min}–${input.max} 之间的有效数值`
        : `请检查${label}`;
    })
    .join("；");
  $("#input-errors").hidden = !invalid.length;
  $("#input-errors").textContent = message
    ? `${message}。修正前保留上次有效配置的建议。`
    : "";
  return !invalid.length;
}
function updateSearchOptions() {
  for (const [kind, hint] of [
    ["cpu", "#cpu-search-hint"],
    ["board", "#board-search-hint"],
  ]) {
    const query = $(`#${kind}-search`).value;
    const models = kind === "cpu" ? catalog.cpus : catalog.boards;
    const hits = models.filter((model) => modelMatches(model, query));
    const ids = new Set(hits.map((model) => model.id));
    for (const option of $(`#${kind}`).options)
      option.hidden = Boolean(
        query.trim() &&
          option.value &&
          option.value !== "custom" &&
          option.value !== config[kind] &&
          !ids.has(option.value),
      );
    $(hint).textContent = query.trim()
      ? `${hits.length} 款匹配；当前选择保留，请选择精确型号。`
      : kind === "board"
        ? "按完整型号、后缀和修订号选择。"
        : "支持空格、连字符及全角输入。";
  }
}
function updateMeta() {
  const cpu = catalog.cpus.find((c) => c.id === $("#cpu").value);
  $("#cpu-meta").innerHTML = cpu
    ? `${cpu.socket} · 基础 ${cpu.basePower} W / 最大睿频 ${cpu.turboPower} W <a href="${cpu.source}" target="_blank" rel="noopener noreferrer">规格 ↗</a>`
    : "";
  const board = catalog.boards.find((b) => b.id === $("#board").value);
  $("#board-meta").innerHTML = board
    ? `${board.socket} · <a href="${board.source}" target="_blank" rel="noopener noreferrer">查看官方资料 ↗</a> · CPU 支持与 BIOS 版本需另核对`
    : "未确认主板型号时，仅提供初步选型建议。";
  $("#custom-board-fields").hidden = $("#board").value !== "custom";
  $("#power-limit-field").hidden = $("#power").value !== "limited";
  $("#power-limit").disabled = $("#power").value !== "limited";
}
function render() {
  updateSearchOptions();
  results = recommend(config, catalog, prices);
  const cpu = catalog.cpus.find((c) => c.id === config.cpu);
  const board = resolveBoard(config, catalog);
  $("#config-summary").innerHTML =
    `<span class="cpu-chip">${escape(cpu.name.replace("Intel ", ""))}</span><span>${escape(board?.name || config.boardName || "主板待确认")}</span><span>${{ gaming: "游戏娱乐", office: "日常办公", production: "持续生产力" }[config.usage]}</span>${config.budget ? `<span>预算 ¥${config.budget}</span>` : ""}`;
  const checks = precheck(config, catalog);
  $("#prechecks").innerHTML = checks
    .map(
      (c) =>
        `<div class="precheck">${icon(c.state)}<div><b>${c.title}</b><small>${escape(c.detail)}</small></div></div>`,
    )
    .join("");
  const failed = checks.some((c) => c.state === "fail");
  const blocked = results.filter((c) => c.status === "blocked").length;
  $("#check-status").textContent = failed
    ? "存在插槽冲突"
    : blocked
      ? `${blocked} 款存在安装冲突`
      : "查看逐项安装条件";
  $("#check-status").className =
    `badge ${failed || blocked ? "blocked" : "pending"}`;
  let note = "以下为候选方案，按用途与选购侧重排序；“待确认”不代表已验证兼容。";
  if (config.power === "unknown")
    note += " 主板功耗设置未知，暂参考 CPU 官方最大睿频功耗，实际需核对 BIOS。";
  if (config.power === "unlimited")
    note +=
      " 已解除功耗限制：无法据公开规格保证满载温度，需结合实测或设定功耗上限。";
  if (config.power === "limited" && !config.powerLimit)
    note += " 尚未填写功耗上限，暂参考官方最大睿频功耗。";
  if (config.budget)
    note += " 报价未知的产品不能判断是否在预算内；已知超预算的产品会被筛除。";
  if (failed)
    note =
      "CPU 与主板插槽不匹配。请先修正配置，当前所有散热器均无法解决该冲突。";
  const matched = matchingBenchmark(config, catalog);
  const mappedCount =
    matched?.results.filter(
      (row) =>
        row.coolerId && catalog.coolers.some((c) => c.id === row.coolerId),
    ).length || 0;
  if (matched && !failed)
    note = `正在参考 ${matched.author} 的同 CPU / 功耗测试。${mappedCount < 2 ? "本组仅有一款已收录安装规格的型号，读数作参考，候选仍按选型规则排序。" : config.preference === "value" ? "预算偏好仍优先比较已填报价。" : "本组已参测产品优先按温度比较，其余按选型规则；未参测不代表性能更差。"}${matched.fanMode === "full" ? "此组为全速，不用于静音排名。" : ""} 安装冲突仍优先排除。`;
  $("#recommendation-note").textContent = note;
  $("#recommendation-note").className =
    `recommendation-note${failed ? " alert" : ""}`;
  const eligible = results.filter(
    (c) => c.status !== "blocked" && !c.overBudget,
  );
  const view = resultView(results, {
    type: filter,
    query: $("#cooler-search").value,
    showBlocked: $("#show-blocked").checked,
  });
  const visible = view.visible;
  $("#metric-candidates").textContent = view.eligible.length;
  $("#metric-pending").textContent = view.pending.length;
  $("#metric-blocked").textContent = view.blocked.length;
  $("#blocked-count").textContent = view.blocked.length;
  $("#answer-value").textContent =
    `${eligible.length} 款候选 · ${blocked} 款冲突`;
  $("#result-count").textContent =
    `${view.eligible.length} 款候选 · ${catalog.coolers.length} 款已收录`;
  $("#cards").innerHTML = visible.length
    ? visible.map((c) => card(c, c.id === eligible[0]?.id)).join("")
    : `<div class="empty"><h3>当前条件下没有候选</h3><p>${view.blocked.length ? `有 ${view.blocked.length} 款存在明确安装冲突，可勾选“显示安装冲突方案”查看原因。` : "尝试清除型号搜索、切换散热类型、调整预算，或核对已填写的报价。"}</p></div>`;
  updateCompare();
  renderBenchmark();
}
function renderBenchmark() {
  const group =
    catalog.benchmarks.find((g) => g.id === config.benchmarkId) ||
    catalog.benchmarks[0];
  $("#benchmark-select").value = group.id;
  $("#benchmark-summary").textContent = matchingBenchmark(config, catalog)
    ? `正在参考：${group.author} · ${group.powerW} W`
    : `${catalog.benchmarks.length} 组原始测试 · 查看条件与读数`;
  $("#benchmark-data").innerHTML = benchmarkTable(group);
  $("#benchmark-match").textContent = matchingBenchmark(config, catalog)
    ? "CPU 与设置功耗对应此组；仅作同组参考，其他环境条件可能不同。"
    : config.preference === "quiet" && group.fanMode === "full"
      ? "全速成绩不参与当前静音偏好的排名。"
      : "当前配置与测试条件不同，以下读数仅供参考。";
}
function productArt(c) {
  const image = c.image;
  return `<div class="product-art${image ? " official-photo" : " illustration"}">${image ? `<button type="button" data-photo="${c.id}" aria-label="放大 ${escape(c.name)} 官方产品图">` : ""}<img src="${image?.path || `assets/${c.type === "air" ? "cooler" : "aio"}.svg`}" alt="${image ? escape(c.name) + " 官方产品图" : "散热器类型示意，非该型号实拍"}" loading="lazy" decoding="async" width="240" height="240">${image ? "</button>" : ""}<span>${image ? "官方产品图 · 点击放大" : "类型示意 · 非产品实拍"}</span></div>`;
}
function specStrip(c) {
  const spec = constructionSummary(c);
  return `<dl class="construction-strip"><div><dt>热管</dt><dd>${escape(spec.heatpipes)}</dd></div><div><dt>热管 / 鳍片连接</dt><dd>${escape(spec.finJoint)}</dd></div><div><dt>标称解热 / TDP</dt><dd>${escape(spec.rating)}</dd></div></dl>`;
}
function constructionDetails(c) {
  const e = c.construction || {};
  const spec = constructionSummary(c);
  const evidence = (item) =>
    item?.source
      ? `<a href="${escape(item.source)}" target="_blank" rel="noopener noreferrer">官方依据 ↗</a>`
      : "";
  const tests = recordedTests(c.id, catalog);
  return `<section class="construction-details"><h3>散热结构与功耗依据</h3><p>结构资料核对：${escape(e.checkedAt || "待核对")}</p>${specStrip(c)}<p><b>底座接触：</b>${escape(spec.base)} ${evidence(e.baseContact)}</p><p>${escape(e.heatpipes?.detail || "热管参数尚待逐型号核对。")}${evidence(e.heatpipes)}</p><p>${escape(e.finJoint?.detail || (c.type === "aio" ? "水冷通过冷头、水路与冷排传热，不使用风冷热管穿 Fin 分类。" : "未取得热管与鳍片连接的一手依据，不能从底座直触、外观或同系列推断。"))}${evidence(e.finJoint)}</p><p>${escape(e.thermalRating?.detail || "未取得该型号厂商公开的解热瓦数，不按热管数或冷排尺寸估算。")}${evidence(e.thermalRating)}</p><aside class="thermal-boundary">最大解热瓦数没有统一的跨品牌测试口径。厂商标称 TDP 不代表任意 CPU 都能在该功耗下压住温度，也不用于本页的兼容通过或性能排名。焊接不等于已确认使用回流工序；底座热管直触也不等于鳍片连接方式。</aside><h3>已收录的实测负载</h3>${tests.length ? tests.map(({ group, row }) => `<p><a href="${escape(group.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(group.author)} · ${escape(group.cpu)} · ${group.powerW} W ↗</a><br>${escape(group.title)} · ${escape(metricLabel(group))} ${row.value}${escape(group.unit)}。测试口径与完整限制见评测资料库。</p>`).join("") : "<p>暂无该精确版本的已核对读数。</p>"}<p>这里列的是测试条件，不能视为散热器最大能力或满载温度保证。<a href="reviews.html#verified-tests">查看测试条件与限制 ↗</a></p></section>`;
}
function photo(id) {
  const c = catalog.coolers.find((c) => c.id === id);
  if (!c?.image) return;
  dialog(
    c.name,
    `<div class="photo-view"><img src="${c.image.path}" alt="${escape(c.name)} 官方产品图"><p>官网外观展示；底座版本、内部工艺和随盒扣具需另核对。</p><a href="${c.image.source}" target="_blank" rel="noopener noreferrer">图片来源 · 官方型号页面 ↗</a></div>`,
  );
}
function card(c, featured) {
  const spec =
    c.type === "air"
      ? c.height === null
        ? "安装高度待核对"
        : `${c.height} mm 高度`
      : `${c.radiatorSize} mm 冷排`;
  return `<article class="cooler-card${featured ? " featured" : ""}" data-id="${c.id}">
    ${featured ? '<div class="card-ribbon"><span>✧ 优先考察</span><span>基于当前用途与已知条件</span></div>' : ""}
    <div class="card-main">${productArt(c)}<div><p class="product-brand">${escape(c.brand)}</p><div class="product-title"><h3>${escape(c.name)}</h3><span class="badge ${c.status}">${statusText[c.status]}</span></div><p class="product-description">${escape(c.description)}</p><div class="specs"><span>${c.type === "air" ? "塔式风冷" : "一体式水冷"}</span><span>${spec}</span><span>${c.maintenance}</span></div>${specStrip(c)}<p class="reason">${c.status === "blocked" ? "× " + escape(c.checks.find((check) => check.state === "fail").detail) : "↳ " + escape(c.checks.find((check) => check.title === "主板安装干涉" && check.state === "conditional")?.detail || c.reasons[0])}</p>${c.reviewUrl ? `<p class="measurement-note"><a href="${c.reviewUrl}" target="_blank" rel="noopener noreferrer">${escape(c.reviewNote)} ↗</a></p>` : c.addedAt ? '<p class="measurement-note">官方规格已收录 · 实测版本待核对</p>' : ""}${c.measured ? `<p class="measurement-note">实测参考 ${c.measured.value}${c.measured.unit} · ${c.measured.author} <a href="${c.measured.sourceUrl}" target="_blank" rel="noopener noreferrer">原始实测 ↗</a></p>` : ""}</div></div>
    <div class="card-bottom"><label class="price-group" for="price-${c.id}">报价 ¥ <input id="price-${c.id}" data-price="${c.id}" type="number" step="any" min="1" max="20000" placeholder="待填写" value="${c.price ?? ""}" aria-label="${escape(c.name)} 实际报价"> <span>非实时售价</span></label><div class="card-actions"><label class="compare-label"><input type="checkbox" data-compare="${c.id}" ${compare.has(c.id) ? "checked" : ""}>加入对比</label><button class="details-button" type="button" data-detail="${c.id}">检查详情 ↗</button></div></div></article>`;
}
function details(id) {
  const c = results.find((c) => c.id === id);
  dialog(
    c.name,
    `<div class="dialog-copy"><span class="badge ${c.status}">${statusText[c.status]}</span><p>${escape(c.notes)}</p>${constructionDetails(c)}${c.checks.map((check) => `<div class="detail-check">${icon(check.state)}<div><b>${check.title} · ${{ pass: "通过", fail: "冲突", unknown: "待确认", conditional: "需调整 / 核对" }[check.state]}</b><p>${escape(check.detail)}</p>${check.source ? `<a class="source-evidence" href="${check.source}" target="_blank" rel="noopener noreferrer">官方适配依据 ↗</a>` : ""}</div></div>`).join("")}<h3>${c.status === "blocked" ? "该型号的实测参考（已排除推荐）" : "为什么出现在候选中"}</h3>${c.reasons.map((reason) => `<p>${escape(reason)}</p>`).join("")}<p>选型规则提供考察方向，不承诺具体温度或噪声表现。规格核对日期：${c.checkedAt || catalog.checkedAt}。</p><a class="source-link" href="${c.source}" target="_blank" rel="noopener noreferrer">${escape(c.sourceLabel || "官方产品规格")} ↗</a>${c.extraSource ? `<a class="source-link" href="${c.extraSource}" target="_blank" rel="noopener noreferrer">安装 / 尺寸依据 ↗</a>` : ""}</div>`,
  );
}
function updateCompare() {
  $("#compare-tray").hidden = compare.size === 0;
  $("#compare-count").textContent = `已选择 ${compare.size} / 3 款`;
  $("#compare-items").innerHTML = catalog.coolers
    .filter((c) => compare.has(c.id))
    .map(
      (c) =>
        `<button type="button" data-remove-compare="${c.id}" aria-label="移除 ${escape(c.name)}"><span>${escape(c.name)}</span><span aria-hidden="true">×</span></button>`,
    )
    .join("");
  document.body.classList.toggle("has-comparison", compare.size > 0);
  $("#compare-open").disabled = compare.size < 2;
  $("#compare-open").textContent =
    compare.size < 2 ? "再选 1 款即可对比" : "查看对比 →";
}
function openComparison() {
  const items = results.filter((c) => compare.has(c.id));
  const rows = [
    ["类型", (c) => (c.type === "air" ? "塔式风冷" : "一体式水冷")],
    ["安装状态", (c) => statusText[c.status]],
    ["热管", (c) => constructionSummary(c).heatpipes],
    ["热管 / 鳍片连接", (c) => constructionSummary(c).finJoint],
    ["底座接触", (c) => constructionSummary(c).base],
    ["标称解热 / TDP（非实测上限）", (c) => constructionSummary(c).rating],
    [
      "尺寸",
      (c) =>
        c.type === "air"
          ? c.height === null
            ? "安装高度待核对"
            : `标称高度 ${c.height} mm${c.height !== c.heightUsed && c.heightUsed ? ` / 调整后 ${c.heightUsed} mm` : ""}`
          : `${c.radiatorLength} × ${c.radiatorWidth} × ${stackThickness(c)} mm（含风扇与安装组件）`,
    ],
    [
      "报价",
      (c) =>
        c.price
          ? `¥ ${c.price}${c.overBudget ? "（超预算）" : ""}`
          : "未填写，预算待确认",
    ],
    [
      "需处理事项",
      (c) =>
        c.checks
          .filter((k) => k.state !== "pass")
          .map((k) => `${k.title}：${k.detail}`)
          .join("；") || "当前已知检查通过",
    ],
    [
      "规格 / 原始依据",
      (c) =>
        `<a href="${c.source}" target="_blank" rel="noopener noreferrer">产品规格 ↗</a>`,
    ],
  ];
  dialog(
    "散热方案对比",
    `<div class="table-scroll"><table><thead><tr><th>对比项目</th>${items.map((c) => `<th>${escape(c.name)}</th>`).join("")}</tr></thead><tbody>${rows.map(([name, get]) => `<tr><th scope="row">${name}</th>${items.map((c) => `<td>${name === "规格 / 原始依据" ? get(c) : escape(get(c))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
  );
}
function guide() {
  dialog(
    "怎样选到合适的散热器",
    `<div class="dialog-copy"><h3>1. 从真实配置开始</h3><p>选择 CPU 和主板完整型号。插槽相同只说明平台匹配，主板 CPU 支持列表与 BIOS 版本仍需核对。未收录主板可填写型号和插槽。</p><h3>2. 风冷同时看内存与机箱</h3><p>机箱限高指 CPU 散热器安装限高，并非机箱外壳宽度。若前风扇覆盖内存，抬高风扇会增加安装高度。接近限高时应实测。</p><h3>3. 水冷同时看尺寸与位置</h3><p>“支持 360 冷排”不等于所有 360 水冷都能安装。还要核对冷排实际长宽、孔位、冷排与风扇总厚度、主板与显卡干涉、管路路径，以及水泵连接方式。</p><h3>4. 结合负载和功耗设置</h3><p>持续渲染与游戏的热负载不同。主板自动设置可能改变功耗限制；解除限制时，选型无法保证满载温度。静音取决于机箱风道、实际负载和风扇曲线。</p><h3>5. 用实际报价决定预算</h3><p>填入你看到的实际购买价格，设置预算后会排除已知超预算的产品。未知报价保留为待核对，不会被当成免费。</p></div>`,
  );
}
$("#dialog-body").addEventListener("click", (event) => {
  const picture = event.target.closest("[data-photo]");
  if (picture) photo(picture.dataset.photo);
});
function sources() {
  dialog(
    "数据来源与推荐方法",
    `<div class="dialog-copy"><p>当前收录 ${catalog.cpus.length} 款 Intel 台式机 CPU、${catalog.boards.length} 款主板、${catalog.coolers.length} 款散热器。基础规格核对日期：${catalog.checkedAt}；最近补充：${catalog.lastExpandedAt || catalog.checkedAt}。这是有限型号的数据库，不代表覆盖全部市场产品。</p><h3>规格事实</h3><p>CPU 插槽、基础功耗、最大睿频功耗及散热器尺寸采用品牌公开资料。CQ125 暂仅取得原始评测，安装高度与未确认的扣具不填写。内存净空、冷排尺寸等只在有依据时填写。</p><ul>${[...catalog.cpus, ...catalog.boards, ...catalog.coolers].map((c) => `<li><a href="${c.source}" target="_blank" rel="noopener noreferrer">${escape(c.name)} ↗</a></li>`).join("")}</ul><h3>安装组合的证据边界</h3><p>已收录 ${catalog.overrides.length} 条主板与散热器安装记录，包括 VRM 干涉、M.2 散热片冲突和安装方向限制。未收录的组合保持待确认，不从插槽相同推断可安装。更换安装方向、扣具或产品版本后需要重新核对。</p><h3>评测资料</h3><p><a href="reviews.html">查看 51972 往期评测资料库与核对进度 ↗</a>。已录入风冷、水冷图表温度和同噪对比；只有 CPU、设置功耗、用途与测试组对应时才参考同组实测。</p><h3>推荐排序</h3><p>先判断插槽和空间冲突，再按用途、功耗设置及偏好给出考察顺序。持续高功耗生产力优先考察大冷排，均衡用途优先考察风冷。若主动选择的实测组与配置对应，则对该组已参测型号优先比较读数；其他型号仍按选型规则，不将跨平台图表拼成总榜，也不作散热能力保证。</p><p>价格由用户填写，不提供实时商城数据。噪声与温度不跨测试条件直接比较，不编造温度、分贝或性能分数。</p><h3>本地保存与分享</h3><p>配置和报价保存在当前浏览器。分享链接仅包含配置参数，不包含报价；任何获得链接的人均可查看其中的主板型号等信息。未发送至服务器。</p></div>`,
  );
}

async function init() {
  const responses = await Promise.all([
    fetch("data/catalog.json"),
    fetch("data/reviews/benchmarks.json"),
  ]);
  if (responses.some((response) => !response.ok))
    throw new Error("产品数据加载失败");
  const [products, measurements] = await Promise.all(
    responses.map((response) => response.json()),
  );
  catalog = { ...products, benchmarks: measurements.groups };
  $("#benchmark-select").innerHTML = catalog.benchmarks
    .map(
      (group) =>
        `<option value="${group.id}">${escape(group.cpu)} · ${group.powerW}W · ${escape(group.title)} · ${group.author}</option>`,
    )
    .join("");
  $("#catalog-size").textContent =
    `${catalog.cpus.length} 款 Intel CPU · ${catalog.coolers.length} 款散热器 · ${catalog.boards.length} 款主板`;
  $("#cpu").innerHTML = ["LGA1851", "LGA1700"]
    .map(
      (socket) =>
        `<optgroup label="${socket}">${catalog.cpus
          .filter((c) => c.socket === socket)
          .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
          .map((c) => `<option value="${c.id}">${escape(c.name)}</option>`)
          .join("")}</optgroup>`,
    )
    .join("");
  $("#board").innerHTML =
    '<option value="">暂未选择主板</option>' +
    ["LGA1851", "LGA1700"]
      .map(
        (socket) =>
          `<optgroup label="${socket}">${catalog.boards
            .filter((b) => b.socket === socket)
            .sort((a, b) =>
              a.name.localeCompare(b.name, "en", { numeric: true }),
            )
            .map((b) => `<option value="${b.id}">${escape(b.name)}</option>`)
            .join("")}</optgroup>`,
      )
      .join("") +
    '<option value="custom">其他主板 / 手动填写</option>';
  const saved = load();
  config = normalize(saved.config || defaults, catalog);
  for (const c of catalog.coolers)
    if (Number(saved.prices?.[c.id]) > 0 && Number(saved.prices[c.id]) <= 20000)
      prices[c.id] = Number(saved.prices[c.id]);
  if (location.hash.startsWith("#config=")) {
    try {
      const parsed = JSON.parse(decodeURIComponent(location.hash.slice(8)));
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
        throw new Error();
      config = normalize(parsed, catalog);
    } catch {
      toast("分享配置无效，已使用本地配置");
    }
  }
  fillForm();
  let savedMode;
  try {
    savedMode = localStorage.getItem("coolerguide-mode");
  } catch {}
  setMode(savedMode || "quick");
  render();
  document.querySelectorAll("[data-mode]").forEach((button) =>
    button.addEventListener("click", () => {
      setMode(button.dataset.mode);
      if (mode === "quick") validateForm();
      $("#configuration").scrollIntoView({
        behavior:
          document.documentElement.dataset.motion === "reduce"
            ? "auto"
            : "smooth",
        block: "start",
      });
    }),
  );
  $("#show-blocked").addEventListener("change", render);
  $("#compare-items").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-compare]");
    if (!button) return;
    compare.delete(button.dataset.removeCompare);
    render();
    (compare.size ? $("#compare-clear") : $("#cooler-search")).focus({
      preventScroll: true,
    });
  });
  $("#benchmark-select").addEventListener("change", () => {
    config.benchmarkId = $("#benchmark-select").value;
    persist();
    render();
  });
  $("#apply-benchmark").addEventListener("click", () => {
    const group = catalog.benchmarks.find(
      (g) => g.id === $("#benchmark-select").value,
    );
    config = {
      ...config,
      cpu: group.cpuId,
      power: "limited",
      powerLimit: group.powerW,
      usage: "production",
      benchmarkId: group.id,
    };
    fillForm();
    persist();
    render();
    toast("已应用测试 CPU 与功耗，请继续核对你的主板和安装空间");
  });
  form.addEventListener("change", () => {
    if (!readForm()) return;
    persist();
    render();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!readForm()) return;
    const stored = persist();
    render();
    if (!stored) toast("浏览器无法保存配置，本次仍可使用");
    if (innerWidth < 721)
      $("#config-summary").scrollIntoView({
        behavior:
          document.documentElement.dataset.motion === "reduce"
            ? "auto"
            : "smooth",
        block: "start",
      });
  });
  $("#cpu-search").addEventListener("input", (event) => {
    const term = event.target.value.trim();
    const hits = catalog.cpus.filter((c) => modelMatches(c, term));
    if (term && hits.length === 1) {
      $("#cpu").value = hits[0].id;
      if (!readForm()) return;
      persist();
      render();
    }
    updateSearchOptions();
  });
  $("#reset").addEventListener("click", () => {
    config = { ...defaults };
    prices = {};
    compare.clear();
    filter = "all";
    $("#show-blocked").checked = false;
    $("#cooler-search").value = "";
    $("#cpu-search").value = "";
    $("#board-search").value = "";
    $("#board-search-hint").textContent = "按完整型号、后缀和修订号选择。";
    for (const o of $("#board").options) o.hidden = false;
    for (const o of $("#cpu").options) o.hidden = false;
    history.replaceState(null, "", location.pathname + location.search);
    fillForm();
    persist();
    render();
    for (const b of document.querySelectorAll("[data-filter]")) {
      b.classList.toggle("active", b.dataset.filter === "all");
      b.setAttribute("aria-pressed", String(b.dataset.filter === "all"));
    }
    toast("已重置配置与报价");
  });
  $("#board-search").addEventListener("input", (event) => {
    updateSearchOptions();
  });
  form.addEventListener("input", (event) => {
    if (event.target.type === "number") validateForm();
  });
  form.addEventListener(
    "invalid",
    (event) => {
      validateForm();
      const disclosure = event.target.closest("details");
      if (disclosure) disclosure.open = true;
    },
    true,
  );
  document.querySelectorAll("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      render();
    }),
  );
  $("#cooler-search").addEventListener("input", render);
  $("#cards").addEventListener("click", (event) => {
    const picture = event.target.closest("[data-photo]");
    if (picture) photo(picture.dataset.photo);
    const button = event.target.closest("[data-detail]");
    if (button) details(button.dataset.detail);
  });
  $("#cards").addEventListener("change", (event) => {
    if (event.target.dataset.compare) {
      const id = event.target.dataset.compare;
      if (event.target.checked && compare.size >= 3) {
        event.target.checked = false;
        toast("最多同时对比 3 款");
        return;
      }
      if (event.target.checked) compare.add(id);
      else compare.delete(id);
      updateCompare();
    }
    if (event.target.dataset.price) {
      const input = event.target;
      if (!input.checkValidity()) {
        input.reportValidity();
        return;
      }
      const id = input.dataset.price;
      prices[id] = input.value ? Number(input.value) : null;
      persist();
      render();
    }
  });
  $("#share").addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    if (!readForm()) return;
    render();
    const url = new URL(location.href);
    url.hash = "config=" + encodeURIComponent(JSON.stringify(config));
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.href);
      toast("配置链接已复制");
    } catch {
      dialog(
        "分享你的配置",
        `<div class="dialog-copy"><p>复制以下链接即可分享当前配置：</p><textarea id="share-link" rows="5" style="width:100%;font:inherit;overflow-wrap:anywhere" readonly aria-label="配置分享链接">${escape(url.href)}</textarea></div>`,
      );
      $("#share-link").select();
    }
  });
  $("#open-guide").addEventListener("click", guide);
  $("#read-method").addEventListener("click", sources);
  $("#open-sources").addEventListener("click", sources);
  $("#dialog-close").addEventListener("click", () => $("#info-dialog").close());
  $("#info-dialog").addEventListener("click", (event) => {
    if (event.target === $("#info-dialog")) {
      const rect = event.target.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        event.target.close();
    }
  });
  $("#compare-open").addEventListener("click", openComparison);
  $("#compare-clear").addEventListener("click", () => {
    compare.clear();
    render();
  });
}
init().catch((error) => {
  console.error(error);
  $("#cards").innerHTML =
    '<div class="error-panel"><h3>暂时无法加载产品数据</h3><p>请通过本地服务器打开网页，或刷新后重试。</p></div>';
});
