import { escapeHtml as escape, sourceHref } from "./source-links.js";
import {
  constructionSummary,
  recordedTests,
  formatRefPrice,
  cardSpecItems,
} from "./product-specs.js";
import { modelMatches } from "./search.js";
import { resultView } from "./results-view.js";
import { loadView, saveView } from "./view-state.js";
import { nextSteps } from "./next-steps.js";
import { loadData, assetUrl, replaceLocation } from "./data-loader.js";
import { setSectionVisible } from "./ui.js";
import {
  thermalContext,
  powerLabel,
  siliconLabels,
  interfaceLabels,
  thermalSources,
} from "./thermal-context.js";
import { precheck, resolveBoard } from "./compatibility.js";
import {
  benchmarkTable,
  benchmarkOptions,
  matchingBenchmark,
  stackThickness,
  metricLabel,
} from "./benchmarks.js";
import { recommend, statusText } from "./recommendation.js";
import { defaults, normalize, load, save } from "./storage.js";

const $ = (selector) => document.querySelector(selector);
const icon = (state) =>
  `<span class="status-icon ${state}" aria-hidden="true">${{ pass: "✓", fail: "×", unknown: "?", conditional: "!" }[state]}</span>`;
const form = $("#config-form");
let catalog,
  config,
  prices = {},
  filter = "all",
  layout = "grid",
  useRefPrice = true,
  results = [],
  compare = new Set();
let toastTimer, debounceTimer;
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
      ? "先选 CPU 和用途，快速查看候选；切到完整配置可核对主板、机箱限高与内存净空。"
      : "已展开完整装机参数，不知道的参数可留空或点击预设。";
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
  syncPresetPills();
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
    replaceLocation(
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
  }
  invalid.forEach((input) => {
    const details = input.closest("details");
    if (details) details.open = true;
  });
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

function syncPresetPills() {
  document.querySelectorAll("[data-preset-target]").forEach((button) => {
    const input = document.getElementById(button.dataset.presetTarget);
    const current = String(input?.value ?? "").trim();
    const active = current === button.dataset.presetValue;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function syncLayoutButtons() {
  document.querySelectorAll("[data-layout]").forEach((button) => {
    const active = button.dataset.layout === layout;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const cardsEl = $("#cards");
  if (cardsEl) {
    cardsEl.classList.toggle("grid-view", layout === "grid");
    cardsEl.classList.toggle("list-view", layout === "list");
  }
}

function updateSearchOptions() {
  const currentCpu = catalog.cpus.find((c) => c.id === $("#cpu").value);
  const syncSocket = $("#sync-board-socket")?.checked ?? true;

  const cpuQuery = $("#cpu-search").value;
  const cpuHits = catalog.cpus.filter((model) => modelMatches(model, cpuQuery));
  const cpuIds = new Set(cpuHits.map((model) => model.id));
  for (const option of $("#cpu").options) {
    option.hidden = Boolean(
      cpuQuery.trim() &&
        option.value !== config.cpu &&
        !cpuIds.has(option.value),
    );
    option.disabled = option.hidden;
  }
  for (const group of $("#cpu").querySelectorAll("optgroup")) {
    group.hidden = [...group.children].every((opt) => opt.hidden);
  }
  $("#cpu-search-hint").textContent = cpuQuery.trim()
    ? `${cpuHits.length} 款匹配；可点击下方快选或从列表确认。`
    : "支持空格、连字符及全角输入。";
  const cpuQuick = $("#cpu-quick-hits");
  if (cpuQuick) {
    if (cpuQuery.trim() && cpuHits.length) {
      cpuQuick.hidden = false;
      cpuQuick.innerHTML = cpuHits
        .slice(0, 5)
        .map(
          (c) =>
            `<button type="button" class="quick-hit${c.id === $("#cpu").value ? " active" : ""}" data-pick-cpu="${c.id}">${escape(c.name.replace(/^(Intel|AMD)\s+/i, ""))} <small>${c.socket}</small></button>`,
        )
        .join("");
    } else {
      cpuQuick.hidden = true;
      cpuQuick.innerHTML = "";
    }
  }

  const boardQuery = $("#board-search").value;
  const boardHits = catalog.boards.filter(
    (model) =>
      modelMatches(model, boardQuery) &&
      (!syncSocket || !currentCpu || model.socket === currentCpu.socket),
  );
  const boardIds = new Set(boardHits.map((model) => model.id));
  for (const option of $("#board").options) {
    if (!option.value || option.value === "custom") {
      option.hidden = false;
      option.disabled = false;
      continue;
    }
    const board = catalog.boards.find((b) => b.id === option.value);
    const socketBlocked =
      syncSocket && currentCpu && board && board.socket !== currentCpu.socket;
    const queryBlocked = Boolean(
      boardQuery.trim() && !boardIds.has(option.value),
    );
    option.hidden =
      option.value !== config.board && (socketBlocked || queryBlocked);
    option.disabled = option.hidden;
  }
  for (const group of $("#board").querySelectorAll("optgroup")) {
    group.hidden = [...group.children].every((opt) => opt.hidden);
  }
  $("#board-search-hint").textContent = boardQuery.trim()
    ? `${boardHits.length} 款匹配；点击快选或在下方确认完整型号。`
    : syncSocket && currentCpu
      ? `已按 ${currentCpu.socket} 过滤主板；可取消勾选查看全平台。`
      : "按完整型号、后缀和修订号选择。";
  const boardQuick = $("#board-quick-hits");
  if (boardQuick) {
    if (boardQuery.trim() && boardHits.length) {
      boardQuick.hidden = false;
      boardQuick.innerHTML = boardHits
        .slice(0, 5)
        .map(
          (b) =>
            `<button type="button" class="quick-hit${b.id === $("#board").value ? " active" : ""}" data-pick-board="${b.id}">${escape(b.name)} <small>${b.socket}</small></button>`,
        )
        .join("");
    } else {
      boardQuick.hidden = true;
      boardQuick.innerHTML = "";
    }
  }
}

function updateMeta() {
  const cpu = catalog.cpus.find((c) => c.id === $("#cpu").value);
  const isAmd = cpu?.socket === "AM5";
  const amdSpec = isAmd
    ? `TDP ${cpu.basePower} W · ${cpu.turboPower == null ? "PPT 待核对" : `参考 PPT ${cpu.turboPower} W`} · Tjmax ${cpu.tjmax ?? "待核对"}${cpu.tjmax ? " °C" : ""}`
    : "";
  $("#cpu-meta").innerHTML = cpu
    ? `${cpu.socket} · ${isAmd ? amdSpec : `基础 ${cpu.basePower} W / 最大睿频 ${cpu.turboPower} W`} <a href="${sourceHref(cpu.source)}" target="_blank" rel="noopener noreferrer">规格 ↗</a>`
    : "";
  const board = catalog.boards.find((b) => b.id === $("#board").value);
  $("#board-meta").innerHTML = board
    ? `${board.socket} · <a href="${sourceHref(board.source)}" target="_blank" rel="noopener noreferrer">查看官方资料 ↗</a> · CPU 支持与 BIOS 版本需另核对`
    : "未确认主板型号时，仅提供初步选型建议。";
  $("#custom-board-fields").hidden = $("#board").value !== "custom";
  $("#power-limit-field").hidden = $("#power").value !== "limited";
  $("#power-limit").disabled = $("#power").value !== "limited";
  for (const value of ["intel", "unlimited", "undervolt"])
    $("#power").querySelector(`[value="${value}"]`).textContent = powerLabel(value, cpu);
  $("#amd-temperature-field").hidden = !isAmd;
  $("#package-temp").disabled = !isAmd;
}

function resetMeasuredContext(cpuChanged = false) {
  const measured = $("#measured-power");
  const temperature = $("#package-temp");
  if (measured.value || temperature.value) {
    measured.value = "";
    temperature.value = "";
    toast("测量条件已变化，请重新填写实测功耗与温度");
  }
  if (cpuChanged) $("#silicon").value = "unknown";
}

function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!readForm()) return;
    persist();
    render();
  }, 120);
}

function render() {
  updateSearchOptions();
  syncPresetPills();
  syncLayoutButtons();
  results = recommend(config, catalog, prices, { useRefPrice });
  const cpu = catalog.cpus.find((c) => c.id === config.cpu);
  const board = resolveBoard(config, catalog);
  const thermal = thermalContext(config, cpu);
  const tasks = nextSteps(config, catalog, filter);
  $("#next-steps-row").hidden = tasks.length === 0;
  $("#next-count").textContent = tasks.length ? `待补充 (${tasks.length})` : "";
  $("#next-items").innerHTML = tasks
    .slice(0, 3)
    .map(
      (task) =>
        `<button type="button" data-config-target="${task.target}" title="${escape(task.detail)}"><span>${escape(task.title)} <b aria-hidden="true">↗</b></span></button>`,
    )
    .join("");
  $("#thermal-mode").textContent = powerLabel(config.power, cpu);
  $("#thermal-power").textContent =
    thermal.watts == null ? thermal.basis : `${thermal.watts} W · ${thermal.basis}`;
  $("#amd-thermal-summary").hidden = !thermal.amd;
  $("#amd-thermal-summary").textContent = thermal.amd
    ? `AMD 温控核对 · ${thermal.amd.summary}`
    : "";
  $("#thermal-material").textContent =
    `体质：${siliconLabels[config.silicon]} · 介质：${interfaceLabels[config.thermalInterface]}`;
  $("#thermal-alert").hidden = !thermal.attention;
  $("#thermal-alert").textContent = thermal.interfaceNote;
  $("#thermal-notes").innerHTML = thermal.notes
    .map((note) => `<li>${escape(note)}</li>`)
    .join("");
  $("#thermal-sources").innerHTML = [...(thermal.amd?.sources || []), ...thermalSources]
    .map(
      ({ title, url }) =>
        `<a href="${sourceHref(url)}" target="_blank" rel="noopener noreferrer">${escape(title)} ↗</a>`,
    )
    .join("");
  $("#config-summary").innerHTML =
    `<span class="cpu-chip">${escape(cpu.name.replace(/^(Intel|AMD)\s+/i, ""))}</span><span>${escape(board?.name || config.boardName || "主板待确认")}</span><span>${{ gaming: "游戏娱乐", office: "日常办公", production: "持续生产力" }[config.usage]}</span>${config.caseHeight ? `<span>限高 ${config.caseHeight}mm</span>` : ""}${config.ramHeight ? `<span>内存 ${config.ramHeight}mm</span>` : ""}${config.budget ? `<span>预算 ¥${config.budget}</span>` : ""}`;
  const checks = precheck(config, catalog);
  $("#prechecks").innerHTML = checks
    .map(
      (c) =>
        `<div class="precheck">${icon(c.state)}<div><b>${c.title}</b><small>${escape(c.detail)}</small></div></div>`,
    )
    .join("");
  const failed = checks.some((c) => c.state === "fail");
  const eligible = results.filter(
    (c) =>
      c.status !== "blocked" &&
      !c.overBudget &&
      (!useRefPrice || !c.overRefBudget),
  );
  const view = resultView(results, {
    type: filter,
    query: $("#cooler-search").value,
    showBlocked: $("#show-blocked").checked,
    sort: $("#result-sort").value,
    useRefPrice,
  });
  const blocked = results.filter((c) => c.status === "blocked").length;
  $("#check-status").textContent = failed
    ? "存在插槽冲突"
    : view.ready.length > 0
      ? `${view.ready.length} 款尺寸匹配`
      : blocked
        ? `${blocked} 款存在冲突`
        : "待补齐尺寸";
  $("#check-status").className =
    `badge ${failed ? "blocked" : view.ready.length > 0 ? "dimensions-ok" : blocked ? "blocked" : "pending"}`;

  let note = "按用途与空间考察。点「详情」查看安装条件、功耗依据和资料来源。";
  if (config.power === "unlimited")
    note = thermal.amd
      ? "PBO 已设为放宽限制。按当前用途记录实际功耗和温度，结合持续频率判断是否需要调整散热或功耗。"
      : "已解除功耗限制：满载温控依赖机箱风道与个体体质，建议核对同平台实测或设定合理功耗上限。";
  if (config.power === "limited" && !config.powerLimit)
    note = "尚未填写手动功耗上限，暂按 CPU 官方默认功耗参考。";
  if (config.budget && !useRefPrice)
    note += " 已关闭参考价估算：仅排除你手动填入超预算的型号。";
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
    note = `正在参考 ${matched.author} 的同 CPU / 功耗测试（${mappedCount} 款已入库对比，安装冲突仍优先排除）。`;
  $("#recommendation-note").textContent = note;
  $("#recommendation-note").className =
    `recommendation-note${failed ? " alert" : ""}`;

  $("#filter-summary").textContent =
    `${{ all: "全部类型", air: "风冷", aio: "水冷" }[filter]} · ${$("#cooler-search").value.trim() ? `“${$("#cooler-search").value.trim()}”` : "全型号"} · ${$("#result-sort").selectedOptions[0].textContent}`;
  if (
    $("#result-sort").value === "price" &&
    !useRefPrice &&
    view.eligible.length &&
    view.eligible.every((c) => !c.price)
  )
    $("#filter-summary").textContent +=
      "（未填报价且未用参考价，暂保留推荐序）";

  const visible = view.visible;
  $("#metric-candidates").textContent = view.eligible.length;
  $("#metric-ready").textContent = view.ready.length;
  $("#metric-pending").textContent = view.pending.length;
  $("#metric-blocked").textContent = view.blocked.length;
  $("#blocked-count").textContent = view.blocked.length;
  $("#answer-value").textContent =
    `${eligible.length} 款候选 · ${view.ready.length} 款尺寸匹配`;
  $("#result-count").textContent =
    `${view.eligible.length} 款候选 · ${catalog.coolers.length} 款已收录`;
  $("#cards").innerHTML = visible.length
    ? visible
        .map((c) =>
          card(
            c,
            $("#result-sort").value === "recommended" &&
              c.id === view.eligible[0]?.id,
          ),
        )
        .join("")
    : `<div class="empty"><h3>当前条件下没有候选</h3><p>${view.blocked.length ? `有 ${view.blocked.length} 款存在明确安装冲突，可勾选“显示冲突方案”查看原因。` : "可尝试放宽预算、清除搜索关键词，或切换散热类型。"}</p></div>`;
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
  const fallback =
    c.formFactor === "downdraft"
      ? "assets/downdraft.svg"
      : `assets/${c.type === "air" ? "cooler" : "aio"}.svg`;
  return `<div class="product-art${image ? " official-photo" : " illustration"}">${image ? `<button type="button" data-photo="${c.id}" aria-label="放大 ${escape(c.name)} 官方产品图">` : ""}<img src="${assetUrl(image?.path || fallback)}" alt="${image ? escape(c.name) + " 官方产品图" : "散热器类型示意，非该型号实拍"}" loading="lazy" decoding="async" width="240" height="240">${image ? "</button>" : ""}<span>${image ? "官方产品图 · 放大" : "类型示意图"}</span></div>`;
}

function specStrip(c) {
  return `<dl class="construction-strip">${cardSpecItems(c, c)
    .map(
      (item) =>
        `<div><dt>${escape(item.label)}</dt><dd>${escape(item.value)}</dd></div>`,
    )
    .join("")}</dl>`;
}

function clearanceMeter(c) {
  if (c.spaceMargin === null) return "";
  const allowed = c.type === "air" ? config.caseHeight : config.radiatorSpace;
  const used = c.type === "air" ? c.heightUsed : stackThickness(c);
  if (!allowed || !used) return "";
  const pct = Math.max(8, Math.min(100, Math.round((used / allowed) * 100)));
  const state =
    c.spaceMargin < 0
      ? "fail"
      : c.spaceMargin < 3 || (c.type === "air" && c.heightUsed !== c.height)
        ? "warn"
        : "ok";
  const label =
    c.spaceMargin < 0
      ? `空间不足：超出 ${Math.abs(c.spaceMargin)} mm（${used} / ${allowed} mm）`
      : `空间占用 ${used} / ${allowed} mm（余量 ${c.spaceMargin} mm）`;
  return `<div class="clearance-meter ${state}"><div class="clearance-track"><span style="width:${pct}%"></span></div><small>${escape(label)}</small></div>`;
}

function constructionDetails(c) {
  const e = c.construction || {};
  const spec = constructionSummary(c);
  const evidence = (item) =>
    item?.source
      ? `<a href="${sourceHref(item.source)}" target="_blank" rel="noopener noreferrer">官方依据 ↗</a>`
      : "";
  const tests = recordedTests(c.id, catalog);
  return `<section class="construction-details"><h3>散热结构与功耗依据</h3><p>结构资料核对：${escape(e.checkedAt || "待核对")} · 日常参考价：${escape(formatRefPrice(c))}</p><dl class="construction-strip"><div><dt>热管</dt><dd>${escape(spec.heatpipes)}</dd></div><div><dt>热管 / 鳍片连接</dt><dd>${escape(spec.finJoint)}</dd></div><div><dt>标称解热 / TDP</dt><dd>${escape(spec.rating)}</dd></div></dl><p><b>底座接触：</b>${escape(spec.base)} ${evidence(e.baseContact)}</p><p>${escape(e.heatpipes?.detail || "热管参数尚待逐型号核对。")}${evidence(e.heatpipes)}</p><p>${escape(e.finJoint?.detail || (c.type === "aio" ? "水冷通过冷头、水路与冷排传热，不使用风冷热管穿 Fin 分类。" : "未取得热管与鳍片连接的一手依据，不能从底座直触、外观或同系列推断。"))}${evidence(e.finJoint)}</p><p>${escape(e.thermalRating?.detail || "未取得该型号厂商公开的解热瓦数，不按热管数或冷排尺寸估算。")}${evidence(e.thermalRating)}</p><aside class="thermal-boundary">最大解热瓦数没有统一的跨品牌测试口径。厂商标称 TDP 不代表任意 CPU 都能在该功耗下压住温度，也不用于本页的兼容通过或性能排名。</aside><h3>已收录的实测负载</h3>${tests.length ? tests.map(({ group, row }) => `<p><a href="${sourceHref(group.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(group.author)} · ${escape(group.cpu)} · ${group.powerW} W ↗</a><br>${escape(group.title)} · ${escape(metricLabel(group))} ${row.value}${escape(group.unit)}。测试口径与完整限制见评测资料库。</p>`).join("") : "<p>暂无该精确版本的已核对读数。</p>"}<p>这里列的是测试条件，不能视为散热器最大能力或满载温度保证。<a href="reviews.html#verified-tests">查看测试条件与限制 ↗</a></p></section>`;
}

function photo(id) {
  const c = catalog.coolers.find((c) => c.id === id);
  if (!c?.image) return;
  dialog(
    c.name,
    `<div class="photo-view"><img src="${assetUrl(c.image.path)}" alt="${escape(c.name)} 官方产品图"><p>官网外观展示；底座版本、内部工艺和随盒扣具需另核对。</p><a href="${sourceHref(c.image.source)}" target="_blank" rel="noopener noreferrer">图片来源 · 官方型号页面 ↗</a></div>`,
  );
}

function card(c, featured) {
  const typeTag =
    c.type === "aio"
      ? `${c.radiatorSize} 一体式水冷`
      : c.formFactor === "downdraft"
        ? "超薄下压风冷"
        : "塔式风冷";
  const tests = recordedTests(c.id, catalog);
  const isAmd = catalog.cpus.find((cpu) => cpu.id === config.cpu)?.socket === "AM5";
  const firstTest = isAmd
    ? tests.find(({ group }) => catalog.cpus.some((cpu) => cpu.id === group.cpuId && cpu.socket === "AM5"))
    : tests[0];
  let testLine = "";
  if (c.measured) {
    testLine = `<p class="measurement-note highlight"><a href="${sourceHref(c.measured.sourceUrl)}" target="_blank" rel="noopener noreferrer">★ 同条件实测：${c.measured.value}${escape(c.measured.unit)}（${escape(c.measured.author)}）↗</a></p>`;
  } else if (firstTest) {
    const { group, row } = firstTest;
    testLine = `<p class="measurement-note"><a href="${sourceHref(group.sourceUrl)}" target="_blank" rel="noopener noreferrer">实测档案：${escape(group.cpu.replace(/^Intel\s+/i, ""))} ${group.powerW}W → ${row.value}${escape(group.unit)}（${group.fanMode === "full" ? "全速" : `${group.noiseDbA}dB`} · ${escape(group.author)}）↗</a></p>`;
  } else if (c.reviewUrl && !isAmd) {
    testLine = `<p class="measurement-note"><a href="${sourceHref(c.reviewUrl)}" target="_blank" rel="noopener noreferrer">${escape(c.reviewNote)} ↗</a></p>`;
  }
  const mountLine = c.amdHints.length
    ? `<p class="measurement-note">${c.amdHints.map(({ title, source }) => `<a href="${sourceHref(source)}" target="_blank" rel="noopener noreferrer">${escape(title)} ↗</a>`).join(" · ")}</p>`
    : "";

  return `<article class="cooler-card${featured ? " featured" : ""}" data-id="${c.id}">
    ${featured ? '<div class="card-ribbon">优先考察</div>' : ""}
    <div class="card-main">${productArt(c)}<div class="card-body"><div class="card-meta-row"><p class="product-brand">${escape(c.brand)} · ${typeTag}</p><span class="badge ${escape(c.fitStage)}" title="审查结论：${escape(statusText[c.status])}">${escape(c.fitLabel)}</span></div><h3 class="card-title">${escape(c.name)}</h3><p class="product-description">${escape(c.description)}</p>${specStrip(c)}${clearanceMeter(c)}<p class="reason">${c.status === "blocked" ? "× " + escape(c.checks.find((check) => check.state === "fail").detail) : "↳ " + escape(c.checks.find((check) => check.title === "主板安装干涉" && check.state === "conditional")?.detail || c.reasons[0])}</p>${mountLine}${testLine}</div></div>
    <div class="card-bottom"><div class="price-block"><span class="ref-price">参考 ${escape(formatRefPrice(c))}</span><label class="price-group" for="price-${c.id}">到手 ¥ <input id="price-${c.id}" data-price="${c.id}" type="number" step="any" min="1" max="20000" placeholder="可选" value="${c.price ?? ""}" aria-label="${escape(c.name)} 实际报价"></label></div><div class="card-actions"><label class="compare-label"><input type="checkbox" data-compare="${c.id}" ${compare.has(c.id) ? "checked" : ""}>对比</label><button class="details-button" type="button" data-detail="${c.id}">详情 ↗</button></div></div></article>`;
}

function details(id) {
  const c = results.find((c) => c.id === id);
  const amdHints = c.amdHints.map(({ title, detail, source }) =>
    `<p><b>${escape(title)}</b> ${escape(detail)} <a href="${sourceHref(source)}" target="_blank" rel="noopener noreferrer">厂商说明 ↗</a></p>`
  ).join("");
  dialog(
    c.name,
    `<div class="dialog-copy"><div class="dialog-badges"><span class="badge ${escape(c.fitStage)}">${escape(c.fitLabel)}</span><span class="badge ${c.status}">${statusText[c.status]}</span></div><p>${escape(c.notes)}</p>${amdHints}${constructionDetails(c)}${c.checks.map((check) => `<div class="detail-check">${icon(check.state)}<div><b>${check.title} · ${{ pass: "通过", fail: "冲突", unknown: "待确认", conditional: "需调整 / 核对" }[check.state]}</b><p>${escape(check.detail)}</p>${check.source ? `<a class="source-evidence" href="${sourceHref(check.source)}" target="_blank" rel="noopener noreferrer">官方适配依据 ↗</a>` : ""}</div></div>`).join("")}<h3>${c.status === "blocked" ? "该型号的实测与分析（已排除推荐）" : "为什么推荐考察"}</h3>${c.reasons.map((reason) => `<p>${escape(reason)}</p>`).join("")}<p>选型规则提供考察方向，不承诺具体温度或噪声表现。规格核对日期：${c.checkedAt || catalog.checkedAt}。</p><a class="source-link" href="${sourceHref(c.source)}" target="_blank" rel="noopener noreferrer">${escape(c.sourceLabel || "官方产品规格")} ↗</a>${c.extraSource ? `<a class="source-link" href="${sourceHref(c.extraSource)}" target="_blank" rel="noopener noreferrer">安装 / 尺寸依据 ↗</a>` : ""}</div>`,
  );
}

function updateCompare() {
  saveView({
    filter,
    query: $("#cooler-search").value,
    sort: $("#result-sort").value,
    showBlocked: $("#show-blocked").checked,
    layout,
    useRefPrice,
    compare: [...compare],
  });
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
  const lowestEffective = Math.min(
    ...items.map((c) => c.effectivePrice || Infinity),
  );
  const lowestHeight = Math.min(
    ...items.map((c) =>
      c.type === "air" && c.heightUsed > 0 ? c.heightUsed : Infinity,
    ),
  );
  const lowestMeasured = Math.min(
    ...items.map((c) => c.measured?.value ?? Infinity),
  );
  const rows = [
    [
      "类型",
      (c) =>
        c.type === "air"
          ? c.formFactor === "downdraft"
            ? "下压式风冷"
            : "塔式风冷"
          : "一体式水冷",
    ],
    ["空间匹配", (c) => c.fitLabel],
    ["官方完整审查", (c) => statusText[c.status]],
    [
      "日常参考价",
      (c) => formatRefPrice(c),
      (c) =>
        Number.isFinite(lowestEffective) &&
        c.effectivePrice === lowestEffective,
    ],
    [
      "到手报价",
      (c) =>
        c.price ? `¥ ${c.price}${c.overBudget ? "（超预算）" : ""}` : "未填写",
    ],
    [
      "尺寸 / 总装厚度",
      (c) =>
        c.type === "air"
          ? c.height === null
            ? "安装高度待核对"
            : `标称高度 ${c.height} mm${c.height !== c.heightUsed && c.heightUsed ? ` / 抬扇后 ${c.heightUsed} mm` : ""}`
          : `${c.radiatorLength} × ${c.radiatorWidth} × ${stackThickness(c)} mm（含风扇与安装组件）`,
      (c) =>
        Number.isFinite(lowestHeight) &&
        c.type === "air" &&
        c.heightUsed === lowestHeight,
    ],
    [
      "内存净空 / 避让",
      (c) =>
        c.type === "aio"
          ? "不占内存槽高度（需核对顶置冷排空间）"
          : c.ramOverhang === false
            ? "默认布局不遮挡内存槽"
            : c.ramClearance != null
              ? `≤ ${c.ramClearance} mm（${c.ramLift ? "支持前扇抬高" : "不支持抬扇"}）`
              : "内存净空待核对",
    ],
    [
      "平台支持 / AM5 偏移",
      (c) =>
        c.sockets.join(" / ") +
        (c.amdHints?.length
          ? `；${c.amdHints.map((h) => h.title).join(" / ")}`
          : ""),
    ],
    ["热管", (c) => constructionSummary(c).heatpipes],
    ["热管 / 鳍片连接", (c) => constructionSummary(c).finJoint],
    ["底座接触", (c) => constructionSummary(c).base],
    ["标称解热 / TDP（非实测上限）", (c) => constructionSummary(c).rating],
    ...(items.some((c) => c.measured)
      ? [
          [
            "当前同条件实测",
            (c) =>
              c.measured
                ? `${c.measured.value}${c.measured.unit}（${c.measured.author}）`
                : "该组未收录",
            (c) =>
              Number.isFinite(lowestMeasured) &&
              c.measured?.value === lowestMeasured,
          ],
        ]
      : []),
    [
      "已收录实测档案",
      (c) => {
        const tests = recordedTests(c.id, catalog);
        return tests.length
          ? tests
              .map(
                ({ group, row }) =>
                  `${group.cpu.replace(/^(?:Intel|AMD)\s+/i, "")} ${group.powerW}W: ${row.value}${group.unit}`,
              )
              .join("；")
          : "暂无收录";
      },
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
        `<a href="${sourceHref(c.source)}" target="_blank" rel="noopener noreferrer">产品规格 ↗</a>`,
    ],
  ];
  const tableRows = rows
    .map(([name, get, isBest]) => {
      const vals = items.map((c) => get(c));
      const same = new Set(vals).size <= 1;
      return `<tr data-same="${same}"><th scope="row">${name}</th>${items
        .map((c, idx) => {
          const val = vals[idx];
          const best = !same && isBest && isBest(c);
          return `<td class="${best ? "compare-best" : ""}">${name === "规格 / 原始依据" ? val : escape(val)}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");
  dialog(
    "散热方案对比",
    `<label class="conflict-toggle compare-diff-toggle"><input type="checkbox" id="compare-diff-only" />仅显示有差异的项目</label><div class="table-scroll"><table class="compare-table"><thead><tr><th>对比项目</th>${items.map((c) => `<th>${escape(c.name)}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></div>`,
  );
  $("#compare-diff-only")?.addEventListener("change", (event) => {
    const onlyDiff = event.target.checked;
    $("#dialog-body")
      .querySelectorAll('tr[data-same="true"]')
      .forEach((tr) => {
        tr.hidden = onlyDiff;
      });
  });
}

function guide() {
  dialog(
    "怎样选到合适的散热器",
    `<div class="dialog-copy"><h3>1. 先定平台与主板</h3><p>支持 Intel LGA1851 / LGA1700 与 AMD AM5 桌面平台。选择 CPU 后会自动按插槽过滤主板；未收录主板可填写型号和插槽。</p><h3>2. 一键填好空间尺寸</h3><p>利用「机箱预设」和「内存预设」快速填入限高与内存高度，即可直接看到「尺寸与插槽匹配」的绿标反馈。接近限高（余量小于 3 mm）时仍建议实测公差。</p><h3>3. 水冷看冷排与总厚度</h3><p>“支持 360 冷排”不等于所有 360 都能装进顶置位。厚冷排（如 63–66 mm 总厚）必须核对冷排可用厚度和主板装甲干涉。</p><h3>4. 结合参考价与实测档案</h3><p>每张卡片附带日常参考价区间；你也可以填写实际到手价覆盖预算判断。同条件实测结果仅供参考，不跨平台混排。</p></div>`,
  );
}

$("#dialog-body").addEventListener("click", (event) => {
  const picture = event.target.closest("[data-photo]");
  if (picture) photo(picture.dataset.photo);
});

function sources() {
  const refNote =
    catalog.refPriceNote ||
    "日常参考价目前缺少逐型号实时报价链接，仅用于粗筛预算。";
  dialog(
    "数据来源与推荐方法",
    `<div class="dialog-copy"><p>当前收录 ${catalog.cpus.length} 款桌面平台 CPU（Intel / AMD AM5）、${catalog.boards.length} 款主板、${catalog.coolers.length} 款散热器。基础规格核对日期：${catalog.checkedAt}；最近补充：${catalog.lastExpandedAt || catalog.checkedAt}；参考价整理日期：${catalog.refPriceCheckedAt || catalog.lastExpandedAt || catalog.checkedAt}。</p><h3>规格与兼容分层</h3><p>CPU 插槽、功耗上限及散热器尺寸采用品牌公开资料。当插槽、扣具、机箱限高（或冷排尺寸与总厚度）均匹配时，卡片显示「尺寸与插槽匹配」，仅已知标称高度的型号会提示净空待核；逐主板 VRM / M.2 干涉与官方兼容记录已录入 ${catalog.overrides.length} 组（含官方确认兼容、有条件安装与明确冲突）。</p><h3>日常参考价与手填报价</h3><p>${escape(refNote)}你在卡片填写的到手报价仅存于本地浏览器且优先参与预算判断。</p><h3>评测资料</h3><p><a href="reviews.html">查看 51972 往期评测资料库与核对进度 ↗</a>。已录入 Intel 与 AMD AM5 风冷、水冷图表温度和同噪对比；卡片仅在条件完全对应时展示同条件优先，并附上已收录原始测试档案链接供核查。</p><ul>${[...catalog.cpus, ...catalog.boards, ...catalog.coolers].map((c) => `<li><a href="${sourceHref(c.source)}" target="_blank" rel="noopener noreferrer">${escape(c.name)} ↗</a></li>`).join("")}</ul></div>`,
  );
}

async function init() {
  const [products, measurements] = await Promise.all([
    loadData("data/catalog.json"),
    loadData("data/reviews/benchmarks.json"),
  ]);
  catalog = { ...products, benchmarks: measurements.groups };
  $("#benchmark-select").innerHTML = benchmarkOptions(catalog.benchmarks);
  $("#catalog-size").textContent =
    `（已收录 ${catalog.cpus.length} 款 CPU · ${catalog.coolers.length} 款散热器 · ${catalog.boards.length} 款主板）`;
  $("#cpu").innerHTML = ["LGA1851", "LGA1700", "AM5"]
    .map((socket) => {
      const list = catalog.cpus
        .filter((c) => c.socket === socket)
        .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
      return list.length
        ? `<optgroup label="${socket}">${list.map((c) => `<option value="${c.id}">${escape(c.name)}</option>`).join("")}</optgroup>`
        : "";
    })
    .join("");
  $("#board").innerHTML =
    '<option value="">暂未选择主板</option>' +
    ["LGA1851", "LGA1700", "AM5"]
      .map((socket) => {
        const list = catalog.boards
          .filter((b) => b.socket === socket)
          .sort((a, b) =>
            a.name.localeCompare(b.name, "en", { numeric: true }),
          );
        return list.length
          ? `<optgroup label="${socket}">${list.map((b) => `<option value="${b.id}">${escape(b.name)}</option>`).join("")}</optgroup>`
          : "";
      })
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
  if (
    location.hash.startsWith("#config=") &&
    matchingBenchmark(config, catalog)
  ) {
    $("#benchmark-disclosure").open = true;
  }
  let savedMode;
  try {
    savedMode = localStorage.getItem("coolerguide-mode");
  } catch {}
  setMode(savedMode || "quick");
  const view = loadView(catalog);
  compare = new Set(view.compare);
  layout = view.layout;
  useRefPrice = view.useRefPrice;
  if ($("#use-ref-price")) $("#use-ref-price").checked = useRefPrice;
  if (!location.hash.startsWith("#config=")) {
    filter = view.filter;
    $("#cooler-search").value = view.query;
    $("#result-sort").value = view.sort;
    $("#show-blocked").checked = view.showBlocked;
  }
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.filter === filter),
    );
  });
  render();

  $("#next-items").addEventListener("click", (event) => {
    const button = event.target.closest("[data-config-target]");
    if (!button) return;
    const target = document.getElementById(button.dataset.configTarget);
    const detail = target.closest("details");
    if (detail) detail.open = true;
    if (target.closest("#fit-fields")) setMode("full");
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: "center",
      behavior:
        document.documentElement.dataset.motion === "reduce"
          ? "auto"
          : "smooth",
    });
  });

  document.querySelectorAll("[data-preset-target]").forEach((button) =>
    button.addEventListener("click", () => {
      clearTimeout(debounceTimer);
      const input = document.getElementById(button.dataset.presetTarget);
      if (!input) return;
      input.value = button.dataset.presetValue;
      if (!readForm()) return;
      persist();
      render();
    }),
  );

  $("#cpu-quick-hits")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-pick-cpu]");
    if (!btn) return;
    clearTimeout(debounceTimer);
    if (config.cpu !== btn.dataset.pickCpu) resetMeasuredContext(true);
    $("#cpu").value = btn.dataset.pickCpu;
    if (!readForm()) return;
    persist();
    render();
  });

  $("#board-quick-hits")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-pick-board]");
    if (!btn) return;
    clearTimeout(debounceTimer);
    if (config.board !== btn.dataset.pickBoard) $("#package-temp").value = "";
    $("#board").value = btn.dataset.pickBoard;
    if (!readForm()) return;
    persist();
    render();
  });

  $("#sync-board-socket")?.addEventListener("change", () => {
    updateSearchOptions();
  });

  $("#use-ref-price")?.addEventListener("change", () => {
    useRefPrice = $("#use-ref-price").checked;
    render();
  });

  document.querySelectorAll("[data-layout]").forEach((button) =>
    button.addEventListener("click", () => {
      layout = button.dataset.layout;
      syncLayoutButtons();
      updateCompare();
    }),
  );

  $("#result-sort").addEventListener("change", render);
  $("#clear-filters").addEventListener("click", () => {
    filter = "all";
    $("#cooler-search").value = "";
    $("#result-sort").value = "recommended";
    $("#show-blocked").checked = false;
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === "all");
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === "all"),
      );
    });
    render();
  });
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
    clearTimeout(debounceTimer);
    config = {
      ...config,
      cpu: group.cpuId,
      power: "limited",
      powerLimit: group.powerW,
      measuredPower: null,
      silicon: config.cpu === group.cpuId ? config.silicon : "unknown",
      usage: "production",
      benchmarkId: group.id,
      packageTemp: null,
    };
    fillForm();
    persist();
    render();
    toast("已应用测试 CPU 与功耗，请继续核对你的主板和安装空间");
  });
  form.addEventListener("change", (event) => {
    if (
      event.target.id === "sync-board-socket" ||
      event.target.id === "use-ref-price"
    )
      return;
    clearTimeout(debounceTimer);
    if (["cpu", "usage", "power", "powerLimit"].includes(event.target.name))
      resetMeasuredContext(event.target.name === "cpu");
    else if (event.target.name === "board") $("#package-temp").value = "";
    if (!readForm()) return;
    persist();
    render();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(debounceTimer);
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
      if (config.cpu !== hits[0].id) resetMeasuredContext(true);
      $("#cpu").value = hits[0].id;
      if (!readForm()) return;
      persist();
      render();
      return;
    }
    updateSearchOptions();
  });
  $("#reset").addEventListener("click", () => {
    clearTimeout(debounceTimer);
    config = { ...defaults };
    prices = {};
    compare.clear();
    filter = "all";
    useRefPrice = true;
    if ($("#use-ref-price")) $("#use-ref-price").checked = true;
    if ($("#sync-board-socket")) $("#sync-board-socket").checked = true;
    $("#result-sort").value = "recommended";
    $("#show-blocked").checked = false;
    $("#cooler-search").value = "";
    $("#cpu-search").value = "";
    $("#board-search").value = "";
    for (const o of $("#board").options) {
      o.hidden = false;
      o.disabled = false;
    }
    for (const o of $("#cpu").options) {
      o.hidden = false;
      o.disabled = false;
    }
    replaceLocation(location.pathname + location.search);
    fillForm();
    persist();
    render();
    for (const b of document.querySelectorAll("[data-filter]")) {
      b.classList.toggle("active", b.dataset.filter === "all");
      b.setAttribute("aria-pressed", String(b.dataset.filter === "all"));
    }
    toast("已重置配置与报价");
  });
  $("#board-search").addEventListener("input", () => {
    updateSearchOptions();
  });
  form.addEventListener("input", (event) => {
    if (event.target.id === "cpu-search" || event.target.id === "board-search")
      return;
    if (event.target.type === "number" || event.target.name === "boardName") {
      validateForm();
      syncPresetPills();
      scheduleUpdate();
    }
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
    const url = new URL(
      location.protocol === "file:"
        ? "https://lightningz-x.github.io/cpu-cooler/"
        : location.href,
    );
    url.hash = "config=" + encodeURIComponent(JSON.stringify(config));
    if (location.protocol !== "file:") replaceLocation(url);
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
  $(".result-reference-links a").addEventListener("click", () => {
    $("#benchmark-disclosure").open = true;
  });
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
    '<div class="error-panel"><h3>暂时无法加载产品数据</h3><p>请保留完整项目文件，或打开单文件离线版。也可以刷新后重试。</p></div>';
});
