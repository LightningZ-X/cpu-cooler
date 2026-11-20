const key = "coolerguide-v1";
export const defaults = {
  cpu: "245k",
  board: "",
  boardName: "",
  boardSocket: "",
  caseHeight: null,
  ramHeight: null,
  radiatorSize: null,
  radiatorSpace: null,
  radiatorFit: false,
  headers: false,
  usage: "gaming",
  power: "unknown",
  powerLimit: null,
  measuredPower: null,
  packageTemp: null,
  silicon: "unknown",
  thermalInterface: "unknown",
  preference: "balanced",
  budget: null,
  benchmarkId: "",
};
export function normalize(raw, catalog) {
  const config = { ...defaults };
  if (catalog.benchmarks?.some((group) => group.id === raw.benchmarkId))
    config.benchmarkId = raw.benchmarkId;
  for (const field of [
    "cpu",
    "board",
    "usage",
    "power",
    "preference",
    "silicon",
    "thermalInterface",
  ]) {
    const allowed = {
      cpu: catalog.cpus.map((c) => c.id),
      board: ["", "custom", ...catalog.boards.map((b) => b.id)],
      usage: ["gaming", "office", "production"],
      power: [
        "unknown",
        "intel",
        "limited",
        "unlimited",
        "overclock",
        "undervolt",
      ],
      silicon: ["unknown", "efficient", "typical", "hot"],
      thermalInterface: [
        "unknown",
        "paste",
        "phase",
        "liquid",
        "sheet",
        "degraded",
        "missing",
      ],
      preference: ["balanced", "quiet", "value", "performance"],
    }[field];
    if (allowed.includes(raw[field])) config[field] = raw[field];
  }
  config.boardName = String(raw.boardName || "").slice(0, 100);
  config.boardSocket = ["LGA1700", "LGA1851", "AM5"].includes(raw.boardSocket)
    ? raw.boardSocket
    : "";
  const ranges = {
    caseHeight: [30, 300],
    ramHeight: [15, 100],
    radiatorSpace: [20, 150],
    powerLimit: [35, 500],
    measuredPower: [5, 600],
    packageTemp: [0, 120],
    budget: [1, 20000],
  };
  for (const [field, [min, max]] of Object.entries(ranges)) {
    const input = raw[field];
    const value = typeof input === "number" || (typeof input === "string" && input.trim())
      ? Number(input)
      : NaN;
    config[field] =
      Number.isFinite(value) && value >= min && value <= max ? value : null;
  }
  if (catalog.cpus.find((cpu) => cpu.id === config.cpu)?.socket !== "AM5")
    config.packageTemp = null;
  config.radiatorSize =
    [0, 240, 280, 360, 420].includes(Number(raw.radiatorSize)) &&
    raw.radiatorSize !== null &&
    raw.radiatorSize !== "" &&
    raw.radiatorSize !== undefined
      ? Number(raw.radiatorSize)
      : null;
  config.radiatorFit = raw.radiatorFit === true;
  config.headers = raw.headers === true;
  if (config.board !== "custom") {
    config.boardSocket = "";
    config.boardName = "";
  }
  return config;
}
export function load() {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}
export function save(value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
