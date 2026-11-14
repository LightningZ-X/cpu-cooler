import { benchmarkTable } from "./benchmarks.js";
const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
let inventory, evidence, entries, benchmarkData, catalog;
function renderConflicts() {
  const term = $("#conflict-search").value.toLowerCase().trim();
  const pairs = catalog.overrides
    .map((pair) => ({
      ...pair,
      boardName: catalog.boards.find((b) => b.id === pair.board).name,
      coolerName: catalog.coolers.find((c) => c.id === pair.cooler).name,
    }))
    .filter((pair) =>
      `${pair.boardName} ${pair.coolerName}`.toLowerCase().includes(term),
    );
  $("#conflict-list").innerHTML = pairs.length
    ? `<table class="conflict-table"><thead><tr><th>主板完整型号</th><th>散热器 / 结论</th><th>冲突与处理条件</th><th>证据</th></tr></thead><tbody>${pairs.map((pair) => `<tr><td>${escape(pair.boardName)}</td><td>${escape(pair.coolerName)}<br><span class="badge ${pair.state === "fail" ? "blocked" : "conditional"}">${pair.state === "fail" ? "不兼容" : "须调整安装"}</span></td><td>${escape(pair.detail)}</td><td><a href="${pair.source}" target="_blank" rel="noopener noreferrer">官方逐板记录 ↗</a><br>${pair.checkedAt}</td></tr>`).join("")}</tbody></table>`
    : '<p class="field-note">没有匹配的已知记录。这不等于已验证兼容。</p>';
}
function render() {
  const term = $("#video-search").value.trim().toLowerCase();
  const category = $("#video-category").value,
    year = $("#video-year").value;
  const filtered = entries.filter(
    (video) =>
      (category === "all" ||
        (category === "related" && video.category !== "other") ||
        category === video.category) &&
      (year === "all" || video.publishedAt.startsWith(year)) &&
      `${video.title} ${video.bvid}`.toLowerCase().includes(term),
  );
  $("#video-count").textContent = `${filtered.length} 条资料`;
  $("#video-list").innerHTML = filtered.length
    ? filtered
        .map(
          (video) =>
            `<article class="video-entry"><time class="video-date" datetime="${video.publishedAt.slice(0, 10)}">${video.publishedAt.slice(0, 10)}</time><div><h3>${escape(video.title)} <span class="video-status">${video.status === "measurements-partial" ? "部分图表读数已核对" : video.status === "conditions-only" ? "测试条件已核对" : "目录 / 简介已核对"}</span></h3><p>${escape(video.note || "已取得投稿元数据；视频中的温度、噪声、测试条件与结论待逐项核对。")}</p><small>${video.bvid}${video.duration ? " · " + escape(video.duration) : ""} · ${video.inArchive ? "公开目录" : "原始视频补充索引"}</small></div><a href="${video.url}" target="_blank" rel="noopener noreferrer">查看原视频 ↗</a></article>`,
        )
        .join("")
    : '<div class="empty"><h3>没有匹配的资料</h3><p>试试其他关键词、年份或类别。</p></div>';
}
async function init() {
  const responses = await Promise.all([
    fetch("data/reviews/51972-videos.json"),
    fetch("data/reviews/51972-evidence.json"),
    fetch("data/reviews/benchmarks.json"),
    fetch("data/catalog.json"),
  ]);
  if (responses.some((response) => !response.ok))
    throw new Error("资料加载失败");
  [inventory, evidence, benchmarkData, catalog] = await Promise.all(
    responses.map((response) => response.json()),
  );
  const indexed = new Map(
    inventory.videos.map((video) => [
      video.bvid,
      { ...video, inArchive: true },
    ]),
  );
  for (const video of evidence.sources)
    indexed.set(video.bvid, { ...indexed.get(video.bvid), ...video });
  entries = [...indexed.values()].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const related = entries.filter((video) => video.category !== "other").length;
  $("#collection-stats").innerHTML = [
    ["公开投稿总数", inventory.reportedCount],
    ["已取得目录", inventory.collectedCount],
    ["相关资料索引", related],
    [
      "已核对温度读数",
      benchmarkData.groups.reduce(
        (sum, group) => sum + group.results.length,
        0,
      ),
    ],
  ]
    .map(
      ([label, count]) =>
        `<div class="review-stat"><b>${count}</b><span>${label}</span></div>`,
    )
    .join("");
  $("#collection-scope").textContent =
    `采集日期 ${inventory.collectedAt.slice(0, 10)}。${inventory.publicArchiveComplete ? "已取得当前全部公开投稿目录。" : `目录尚未完整：取得 ${inventory.collectedCount} / ${inventory.reportedCount} 条，其余分页访问受限。`}已补充 ${entries.length - inventory.collectedCount} 条较早索引。现有 ${evidence.measurementCount} 条 51972 图表温度读数、2 条 GamersNexus 同噪对比读数和 ${catalog.overrides.length} 条官方安装记录。仅对已核对的条件使用数据，未完成全量视频与后续更正审计。`;
  $("#review-benchmark").innerHTML = benchmarkData.groups
    .map(
      (group) =>
        `<option value="${group.id}">${escape(group.cpu)} · ${group.powerW}W · ${escape(group.title)} · ${group.author}</option>`,
    )
    .join("");
  const showBenchmark = () =>
    ($("#review-benchmark-data").innerHTML = benchmarkTable(
      benchmarkData.groups.find(
        (group) => group.id === $("#review-benchmark").value,
      ),
    ));
  $("#review-benchmark").addEventListener("change", showBenchmark);
  showBenchmark();
  $("#conflict-search").addEventListener("input", renderConflicts);
  renderConflicts();
  $("#new-model-list").innerHTML =
    `<table class="conflict-table"><thead><tr><th>精确型号</th><th>安装高度</th><th>数据进度 / 出处</th></tr></thead><tbody>${catalog.coolers
      .filter((c) => c.addedAt)
      .map(
        (c) =>
          `<tr><td>${escape(c.brand)}<br><b>${escape(c.name)}</b></td><td>${c.height === null ? "待核对" : `${c.height} mm`}<br>${c.ramClearance == null ? "内存净空待核对" : `内存上限 ${c.ramClearance} mm`}</td><td><a href="${c.source}" target="_blank" rel="noopener noreferrer">${escape(c.sourceLabel || "官方规格")} ↗</a><br>${c.reviewUrl ? `<a href="${c.reviewUrl}" target="_blank" rel="noopener noreferrer">${escape(c.reviewNote)} ↗</a>` : "实测版本待核对"}</td></tr>`,
      )
      .join("")}</tbody></table>`;
  $("#video-year").innerHTML =
    '<option value="all">全部年份</option>' +
    [...new Set(entries.map((video) => video.publishedAt.slice(0, 4)))]
      .sort()
      .reverse()
      .map((year) => `<option value="${year}">${year} 年</option>`)
      .join("");
  $("#test-groups").innerHTML = evidence.testGroups
    .map(
      (group) =>
        `<article class="test-group"><small>${escape(group.label)}</small><h3>${escape(group.cpu)} · ${group.powerW} W</h3><p>${escape(group.fanMode)} / ${escape(group.pasteMode || "硅脂条件待核对")}<br>${group.results.length ? `${group.results.length} 条温度读数已核对` : "图表读数待核对"}</p><a href="https://www.bilibili.com/video/${group.source}/?t=${group.timestamp}" target="_blank" rel="noopener noreferrer">查看测试章节 ↗</a></article>`,
    )
    .join("");
  for (const selector of ["#video-search", "#video-category", "#video-year"])
    $(selector).addEventListener(
      selector === "#video-search" ? "input" : "change",
      render,
    );
  render();
}
init().catch((error) => {
  console.error(error);
  $("#collection-scope").textContent = "资料暂时无法加载，请刷新重试。";
});
