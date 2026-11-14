export function matchingBenchmark(config, catalog) {
  const group = catalog.benchmarks?.find(
    (item) => item.id === config.benchmarkId,
  );
  if (
    !group ||
    config.cpu !== group.cpuId ||
    config.power !== "limited" ||
    Number(config.powerLimit) !== group.powerW ||
    config.usage !== "production"
  )
    return null;
  if (config.preference === "quiet" && group.fanMode === "full") return null;
  return group;
}

export function benchmarkResult(coolerId, config, catalog) {
  const group = matchingBenchmark(config, catalog);
  const row = group?.results.find((result) => result.coolerId === coolerId);
  return row
    ? {
        ...row,
        groupId: group.id,
        metric: group.metric,
        unit: group.unit,
        author: group.author,
        sourceUrl: group.sourceUrl,
      }
    : null;
}

export const stackThickness = (cooler) =>
  cooler.assemblyThickness ?? cooler.radiatorThickness + cooler.fanThickness;
export const metricLabel = (group) =>
  group.metric === "delta-pcore"
    ? "P 核温差（相对室温）"
    : "图表温度（绝对值）";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export function benchmarkTable(group) {
  const rows = [...group.results].sort((a, b) => a.value - b.value);
  return `<p class="benchmark-context">${escape(group.author)} · ${escape(group.cpu)} · ${group.powerW}W · ${group.fanMode === "full" ? "原装风扇全速" : `${group.noiseDbA} dB(A) 同噪`} · ${group.ambientC === null ? "室温未记录" : `室温 ${group.ambientC}℃`}</p><p class="benchmark-conditions">${escape(group.conditions)}</p><div class="table-scroll"><table class="benchmark-table"><thead><tr><th>实测型号 / 版本</th><th>${metricLabel(group)} ↓</th><th>风扇转速</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escape(row.name)}${row.coolerId ? "" : "<small>安装规格尚未入库</small>"}</td><td><b>${row.value}℃</b></td><td>${row.rpm === null ? "未录入" : row.rpm + " RPM"}</td></tr>`).join("")}</tbody></table></div><p class="benchmark-limit">${escape(group.limitations)}</p><a class="source-link" href="${group.sourceUrl}" target="_blank" rel="noopener noreferrer">${escape(group.sourceLabel)} ↗</a>`;
}
