import { escapeHtml as escape, sourceHref } from "./source-links.js";
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
  if (config.measuredPower && Number(config.measuredPower) !== group.powerW)
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
    : group.metric === "delta-tdie"
      ? "Tdie 平均温差（相对室温）"
      : "图表温度（绝对值）";

export function benchmarkOptions(groups) {
  const sections = [
    { label: "AMD AM5", sockets: ["AM5"] },
    { label: "Intel LGA1851", sockets: ["LGA1851"] },
    { label: "Intel LGA1700", sockets: ["LGA1700"] },
  ];
  const seen = new Set();
  const renderOption = (group) =>
    `<option value="${escape(group.id)}">${escape(group.cpu)} · ${group.powerW}W · ${escape(group.title)} · ${escape(group.author)}</option>`;
  const grouped = sections
    .map(({ label, sockets }) => {
      const list = groups.filter((group) => sockets.includes(group.socket));
      list.forEach((group) => seen.add(group.id));
      return list.length
        ? `<optgroup label="${escape(label)}">${list.map(renderOption).join("")}</optgroup>`
        : "";
    })
    .join("");
  const rest = groups.filter((group) => !seen.has(group.id));
  return (
    grouped +
    (rest.length
      ? `<optgroup label="其他平台">${rest.map(renderOption).join("")}</optgroup>`
      : "")
  );
}

export function benchmarkApplyHref(group) {
  const payload = {
    cpu: group.cpuId,
    power: "limited",
    powerLimit: group.powerW,
    usage: "production",
    benchmarkId: group.id,
  };
  return `index.html#config=${encodeURIComponent(JSON.stringify(payload))}`;
}

export function benchmarkTable(group) {
  const rows = [...group.results].sort((a, b) => a.value - b.value);
  return `<p class="benchmark-context">${escape(group.author)} · ${escape(group.cpu)} · ${group.powerW}W · ${group.fanMode === "full" ? "原装风扇全速" : `${group.noiseDbA} dB(A) 同噪`} · ${group.ambientC === null ? "室温未记录" : `室温 ${group.ambientC}℃`}</p><p class="benchmark-conditions">${escape(group.conditions)}</p><div class="table-scroll"><table class="benchmark-table"><thead><tr><th>实测型号 / 版本</th><th>${metricLabel(group)} ↓</th><th>风扇转速</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escape(row.name)}${row.coolerId ? "" : "<small>安装规格尚未入库</small>"}</td><td><b>${row.value}℃</b></td><td>${row.rpm === null ? "未录入" : row.rpm + " RPM"}</td></tr>`).join("")}</tbody></table></div><p class="benchmark-limit">${escape(group.limitations)}</p><a class="source-link" href="${sourceHref(group.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(group.sourceLabel)} ↗</a>`;
}
