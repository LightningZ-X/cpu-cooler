const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
let inventory, evidence, entries;
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
            `<article class="video-entry"><time class="video-date" datetime="${video.publishedAt.slice(0, 10)}">${video.publishedAt.slice(0, 10)}</time><div><h3>${escape(video.title)} <span class="video-status">${video.status === "conditions-only" ? "测试条件已核对" : "目录 / 简介已核对"}</span></h3><p>${escape(video.note || "已取得投稿元数据；视频中的温度、噪声、测试条件与结论待逐项核对。")}</p><small>${video.bvid}${video.duration ? " · " + escape(video.duration) : ""} · ${video.inArchive ? "公开目录" : "原始视频补充索引"}</small></div><a href="${video.url}" target="_blank" rel="noopener noreferrer">查看原视频 ↗</a></article>`,
        )
        .join("")
    : '<div class="empty"><h3>没有匹配的资料</h3><p>试试其他关键词、年份或类别。</p></div>';
}
async function init() {
  const responses = await Promise.all([
    fetch("data/reviews/51972-videos.json"),
    fetch("data/reviews/51972-evidence.json"),
  ]);
  if (responses.some((response) => !response.ok))
    throw new Error("资料加载失败");
  [inventory, evidence] = await Promise.all(
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
    ["已核对实测读数", evidence.measurementCount],
  ]
    .map(
      ([label, count]) =>
        `<div class="review-stat"><b>${count}</b><span>${label}</span></div>`,
    )
    .join("");
  $("#collection-scope").textContent =
    `采集日期 ${inventory.collectedAt.slice(0, 10)}。${inventory.publicArchiveComplete ? "已取得当前全部公开投稿目录。" : `目录尚未完整：取得 ${inventory.collectedCount} / ${inventory.reportedCount} 条，其余分页访问受限。`}已另行补充 ${entries.length - inventory.collectedCount} 条较早原视频索引。标题与简介已整理，未逐一阅览全部视频画面；当前没有核对完成的温度 / 噪声读数，推荐排序仍采用选型规则。分类按标题关键词初筛，可切换全部目录检查。`;
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
        `<article class="test-group"><small>${escape(group.label)}</small><h3>${escape(group.cpu)} · ${group.powerW} W</h3><p>${escape(group.fanMode)} / ${escape(group.pasteMode || "硅脂条件待核对")}<br>环境温度与具体结果待核对</p><a href="https://www.bilibili.com/video/${group.source}/?t=${group.timestamp}" target="_blank" rel="noopener noreferrer">查看测试章节 ↗</a></article>`,
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
