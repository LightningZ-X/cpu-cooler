import { startLightningBoot } from "./boot-animation.js";
const root = document.documentElement;
const systemMotion = matchMedia("(prefers-reduced-motion: reduce)");

let motionPreference = "system";
try {
  motionPreference = localStorage.getItem("coolerguide-motion") || "system";
} catch {}
if (!["system", "full", "reduce"].includes(motionPreference))
  motionPreference = "system";

const reduced = new EventTarget();
Object.defineProperty(reduced, "matches", {
  get: () =>
    motionPreference === "reduce" ||
    (motionPreference === "system" && systemMotion.matches),
});

try {
  localStorage.removeItem("coolerguide-aura");
} catch {}
delete root.dataset.aura;

const motionControl = document.createElement("select");
motionControl.id = "motion-preference";
motionControl.setAttribute("aria-label", "动态效果");
for (const [value, text] of [
  ["system", "动效：跟随系统"],
  ["full", "完整动效"],
  ["reduce", "减少动效"],
]) {
  motionControl.add(new Option(text, value));
}
motionControl.value = motionPreference;

const headerTools = document.querySelector(".site-options-panel") || document.querySelector(".header-tools");
headerTools?.append(motionControl);

function syncMotionPreference() {
  root.dataset.motion = reduced.matches ? "reduce" : "full";
  motionControl.title = `当前${reduced.matches ? "减少" : "开启完整"}动态效果`;
  reduced.dispatchEvent(new Event("change"));
}
motionControl.addEventListener("change", () => {
  motionPreference = motionControl.value;
  try {
    localStorage.setItem("coolerguide-motion", motionPreference);
  } catch {}
  syncMotionPreference();
});
systemMotion.addEventListener("change", syncMotionPreference);
// Establish CSS preference before any entry animations are scheduled.
root.dataset.motion = reduced.matches ? "reduce" : "full";

let headerScanTimer;
let hudScanTimer;
const spotlightSelector =
  ".cooler-card, .diagnostic-bar, .review-stat, .test-group, .principles > div";
let spotlightRaf = 0;
let lastPointerEvent = null;
let lastSpotlightTarget = null;
function clearSpotlight() {
  if (spotlightRaf) {
    cancelAnimationFrame(spotlightRaf);
    spotlightRaf = 0;
  }
  if (lastSpotlightTarget) {
    delete lastSpotlightTarget.dataset.spotlightActive;
    lastSpotlightTarget.style.removeProperty("--mx");
    lastSpotlightTarget.style.removeProperty("--my");
    lastSpotlightTarget = null;
  }
}

const lightControl = document.querySelector("#light-effects");
if (lightControl) {
  let lightsOn = true;
  try {
    lightsOn = localStorage.getItem("coolerguide-light-effects") !== "off";
  } catch {}
  const syncLights = () => {
    root.dataset.lightEffects = lightsOn ? "on" : "off";
    lightControl.setAttribute("aria-pressed", String(lightsOn));
    lightControl.querySelector("span").textContent = lightsOn ? "：开启" : "：关闭";
    if (!lightsOn) {
      clearSpotlight();
      clearTimeout(headerScanTimer);
      clearTimeout(hudScanTimer);
      document
        .querySelector(".site-header")
        ?.removeAttribute("data-lightning-pulse");
      document
        .querySelector(".diagnostic-bar")
        ?.removeAttribute("data-scanning");
    }
  };
  syncLights();
  lightControl.addEventListener("click", () => {
    lightsOn = !lightsOn;
    try {
      localStorage.setItem("coolerguide-light-effects", lightsOn ? "on" : "off");
    } catch {}
    syncLights();
  });
}

function triggerHeaderScan() {
  const header = document.querySelector(".site-header");
  if (
    !header ||
    reduced.matches ||
    document.hidden ||
    root.dataset.lightEffects === "off"
  )
    return;
  clearTimeout(headerScanTimer);
  header.removeAttribute("data-lightning-pulse");
  void header.offsetWidth;
  header.setAttribute("data-lightning-pulse", "true");
  headerScanTimer = setTimeout(
    () => header.removeAttribute("data-lightning-pulse"),
    520,
  );
}

function triggerHudScan() {
  const bar = document.querySelector(".diagnostic-bar");
  if (
    !bar ||
    reduced.matches ||
    document.hidden ||
    root.dataset.lightEffects === "off"
  )
    return;
  clearTimeout(hudScanTimer);
  bar.removeAttribute("data-scanning");
  void bar.offsetWidth;
  bar.setAttribute("data-scanning", "true");
  hudScanTimer = setTimeout(() => bar.removeAttribute("data-scanning"), 540);
}

const systemTheme = matchMedia("(prefers-color-scheme: light)");
const themeButton = document.querySelector("#theme-toggle");
function applyTheme(theme) {
  root.dataset.theme = theme;
  if (themeButton) {
    themeButton.textContent = theme === "dark" ? "浅色" : "深色";
    themeButton.setAttribute("aria-pressed", String(theme === "light"));
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#0c0d0f" : "#f4f2ec");
}
applyTheme(root.dataset.theme);
themeButton?.addEventListener("click", () => {
  const theme = root.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  triggerHeaderScan();
  try {
    localStorage.setItem("coolerguide-theme", theme);
  } catch {}
});
systemTheme.addEventListener("change", () => {
  let stored;
  try {
    stored = localStorage.getItem("coolerguide-theme");
  } catch {}
  if (!stored) applyTheme(systemTheme.matches ? "light" : "dark");
});

const animations = new Set();
const AC_EASE = "cubic-bezier(.22,1,.36,1)";
function animate(element, frames, duration = 300, delay = 0, easing = AC_EASE) {
  if (reduced.matches || !element?.animate || document.hidden) return;
  const animation = element.animate(frames, {
    duration,
    delay,
    easing,
    fill: "backwards",
  });
  animations.add(animation);
  animation.finished.then(
    () => animations.delete(animation),
    () => animations.delete(animation),
  );
  return animation;
}

function enterPage() {
  document
    .querySelectorAll(
      ".site-header, .hero, .decision-toolbar, .review-intro, .config-panel, .results-top, .diagnostic-bar, .catalog-toolbar, .thermal-context, .result-metrics, .check-panel, .review-stats",
    )
    .forEach((element, index) => {
      const box = element.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= innerHeight || box.height === 0) return;
      animate(
        element,
        [
          { opacity: 0.35, transform: "translate3d(0, 12px, 0) scale(0.99)" },
          { opacity: 1, transform: "none" },
        ],
        340,
        Math.min(index, 8) * 28,
      );
    });
}

const overlay = document.querySelector("#boot-screen");
const bootVideo = document.querySelector("#boot-video");
const skip = document.querySelector("#skip-intro");
const replay = document.querySelector("#replay-intro");
let bootTimer,
  bootExit,
  stopBoot,
  previousFocus,
  previousOverflow,
  held = [],
  bootActive = false;
const bootKey = "coolerguide-lightning-seen-v4";
function finishBoot() {
  if (!bootActive) return;
  bootActive = false;
  clearTimeout(bootTimer);
  bootExit?.cancel();
  bootExit = null;
  stopBoot?.();
  stopBoot = null;
  overlay.hidden = true;
  held.forEach((node) => {
    node.inert = false;
  });
  held = [];
  document.body.style.overflow = previousOverflow;
  try {
    localStorage.setItem(bootKey, "1");
  } catch {}
  if (previousFocus?.isConnected && previousFocus !== document.body)
    previousFocus.focus({ preventScroll: true });
  else replay?.focus({ preventScroll: true });
  enterPage();
}
function completeBoot(reason) {
  if (reason !== "ended") {
    finishBoot();
    return;
  }
  bootExit = animate(overlay, [{ opacity: 1 }, { opacity: 0 }], 210);
  if (bootExit)
    bootExit.finished.then(
      () => {
        finishBoot();
        triggerHeaderScan();
      },
      () => {},
    );
  else finishBoot();
}
function startBoot(manual = false) {
  if (
    !overlay ||
    !bootVideo ||
    !skip ||
    bootActive ||
    document.hidden ||
    (reduced.matches && !manual)
  )
    return;
  previousFocus = document.activeElement;
  previousOverflow = document.body.style.overflow;
  held = [...document.body.children].filter(
    (node) => node !== overlay && !node.inert && node.tagName !== "SCRIPT",
  );
  held.forEach((node) => {
    node.inert = true;
  });
  bootActive = true;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  skip.focus({ preventScroll: true });
  // 手动重播给慢网留出缓冲时间。
  bootTimer = setTimeout(finishBoot, manual ? 30000 : 7000);
  try {
    stopBoot = startLightningBoot(bootVideo, completeBoot);
  } catch {
    finishBoot();
  }
}
skip?.addEventListener("click", finishBoot);
replay?.addEventListener("click", () => startBoot(true));
document.addEventListener("keydown", (event) => {
  if (bootActive && event.key === "Escape") {
    event.preventDefault();
    finishBoot();
  }
});

// Sliding glider pill for segmented controls.
function initSlidingTabs() {
  const containers = document.querySelectorAll(
    ".mode-switch, .tabs, .layout-switch",
  );
  containers.forEach((container) => {
    container.dataset.gliderReady = "true";
    const sync = () => {
      const active = container.querySelector('[aria-pressed="true"], .active');
      if (active && active.offsetWidth > 0) {
        container.style.setProperty("--glider-x", `${active.offsetLeft}px`);
        container.style.setProperty("--glider-w", `${active.offsetWidth}px`);
        container.dataset.gliderHasActive = "true";
      } else {
        container.style.setProperty("--glider-w", "0px");
        container.dataset.gliderHasActive = "false";
      }
    };
    sync();
    requestAnimationFrame(sync);
    document.fonts?.ready?.then?.(sync);
    new MutationObserver(sync).observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-pressed"],
    });
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(sync).observe(container);
    } else {
      window.addEventListener("resize", sync);
    }
  });
}
initSlidingTabs();

// Pointer reveal spotlight on cards and HUD blocks.
document.addEventListener(
  "pointermove",
  (event) => {
    if (
      motionPreference === "reduce" ||
      root.dataset.lightEffects === "off" ||
      !["mouse", "pen"].includes(event.pointerType)
    ) {
      clearSpotlight();
      return;
    }
    lastPointerEvent = event;
    if (spotlightRaf) return;
    spotlightRaf = requestAnimationFrame(() => {
      spotlightRaf = 0;
      const ev = lastPointerEvent;
      if (
        !ev ||
        motionPreference === "reduce" ||
        root.dataset.lightEffects === "off"
      )
        return;
      const target = ev.target?.closest?.(spotlightSelector);
      if (lastSpotlightTarget && lastSpotlightTarget !== target) {
        delete lastSpotlightTarget.dataset.spotlightActive;
        lastSpotlightTarget.style.removeProperty("--mx");
        lastSpotlightTarget.style.removeProperty("--my");
      }
      if (target) {
        target.dataset.spotlightActive = "true";
        const rect = target.getBoundingClientRect();
        target.style.setProperty(
          "--mx",
          `${(ev.clientX - rect.left).toFixed(1)}px`,
        );
        target.style.setProperty(
          "--my",
          `${(ev.clientY - rect.top).toFixed(1)}px`,
        );
        lastSpotlightTarget = target;
      } else {
        lastSpotlightTarget = null;
      }
    });
  },
  { passive: true },
);
document.addEventListener("pointerleave", clearSpotlight);

// HUD numeric rolling without delaying or mutating real textContent.
const rollingRafs = new Map();
function clearRoll(element) {
  const rafId = rollingRafs.get(element);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rollingRafs.delete(element);
  }
  element.classList.remove("is-rolling");
  delete element.dataset.rolling;
}
function clearAllRolls() {
  for (const element of [...rollingRafs.keys()]) clearRoll(element);
}
function rollNumber(element, fromVal, toVal) {
  clearRoll(element);
  if (
    reduced.matches ||
    document.hidden ||
    !Number.isFinite(fromVal) ||
    !Number.isFinite(toVal) ||
    fromVal === toVal
  )
    return;
  element.dataset.rolling = String(fromVal);
  element.classList.add("is-rolling");
  const start = performance.now();
  const duration = 280;
  const tick = (now) => {
    if (reduced.matches || document.hidden) {
      clearRoll(element);
      return;
    }
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    element.dataset.rolling = String(
      Math.round(fromVal + (toVal - fromVal) * eased),
    );
    if (t < 1) {
      rollingRafs.set(element, requestAnimationFrame(tick));
    } else {
      clearRoll(element);
    }
  };
  rollingRafs.set(element, requestAnimationFrame(tick));
}

function syncMotion() {
  if (replay) {
    replay.title = reduced.matches
      ? "减少动态效果已开启；点击可手动播放开场"
      : "重播 LIGHTNING 开场";
  }
  if (reduced.matches) {
    finishBoot();
    clearSpotlight();
    clearAllRolls();
    clearTimeout(headerScanTimer);
    clearTimeout(hudScanTimer);
    document
      .querySelector(".site-header")
      ?.removeAttribute("data-lightning-pulse");
    document.querySelector(".diagnostic-bar")?.removeAttribute("data-scanning");
    animations.forEach((animation) => animation.cancel());
  }
}
reduced.addEventListener("change", syncMotion);
syncMotion();
const bootParams = new URLSearchParams(location.search);
let seenIntro = false;
try {
  seenIntro = localStorage.getItem(bootKey) === "1";
} catch {}
if (
  overlay &&
  (!seenIntro || bootParams.get("intro") === "1") &&
  !location.hash &&
  !reduced.matches &&
  !document.hidden &&
  !matchMedia("print").matches &&
  bootParams.get("noanim") !== "1"
)
  startBoot();
else enterPage();
window.addEventListener("pagehide", finishBoot);
window.addEventListener("beforeprint", finishBoot);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    finishBoot();
    clearSpotlight();
    clearAllRolls();
    animations.forEach((animation) => animation.cancel());
  }
});

// Animate native disclosures without replacing their keyboard interaction.
const folding = new Map();
document.addEventListener("click", (event) => {
  const summary = event.target.closest("summary");
  if (
    !summary ||
    summary.parentElement.matches(".site-options") ||
    reduced.matches ||
    !summary.parentElement.animate
  )
    return;
  const details = summary.parentElement;
  folding.get(details)?.();
  event.preventDefault();
  const opening = !details.open;
  const start = details.getBoundingClientRect().height;
  const originalOverflow = details.style.overflow;
  details.open = opening;
  const end = details.getBoundingClientRect().height;
  details.open = true;
  details.style.overflow = "hidden";
  summary.setAttribute("aria-expanded", String(opening));
  let animation;
  const finish = () => {
    folding.delete(details);
    animation?.cancel();
    details.style.overflow = originalOverflow;
    details.open = opening;
    summary.removeAttribute("aria-expanded");
  };
  folding.set(details, finish);
  animation = animate(
    details,
    [{ height: `${start}px` }, { height: `${end}px` }],
    opening ? 320 : 210,
  );
  if (animation) animation.finished.then(finish, () => {});
  else finish();
});
reduced.addEventListener("change", () => {
  if (reduced.matches) [...folding.values()].forEach((finish) => finish());
});
const finishFolds = () => [...folding.values()].forEach((finish) => finish());
window.addEventListener("beforeprint", finishFolds);
window.addEventListener("pagehide", finishFolds);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) finishFolds();
});

const siteOptions = document.querySelector(".site-options");
if (siteOptions) {
  const optionsSummary = siteOptions.querySelector("summary");
  const optionsPanel = siteOptions.querySelector(".site-options-panel");
  const closeSiteOptions = () => {
    siteOptions.open = false;
    optionsSummary?.focus({ preventScroll: true });
  };
  siteOptions.addEventListener("toggle", () => {
    if (siteOptions.open && optionsPanel) {
      animate(
        optionsPanel,
        [
          { opacity: 0.35, transform: "translate3d(0, -6px, 0)" },
          { opacity: 1, transform: "none" },
        ],
        150,
      );
    }
  });
  siteOptions.addEventListener(
    "click",
    (event) => {
      if (event.target.closest(".site-options-panel button:not(#light-effects)"))
        closeSiteOptions();
    },
    { capture: true },
  );
  document.addEventListener("click", (event) => {
    if (siteOptions.open && !siteOptions.contains(event.target))
      siteOptions.open = false;
  });
  siteOptions.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteOptions.open) closeSiteOptions();
  });
}

const infoDialog = document.querySelector("#info-dialog");
if (infoDialog) {
  let dialogAnimation = null;
  new MutationObserver(() => {
    dialogAnimation?.cancel();
    dialogAnimation = null;
    if (infoDialog.open) {
      dialogAnimation = animate(
        infoDialog,
        [
          {
            opacity: 0.92,
            transform: "translate3d(0, 8px, 0) scale(0.985)",
          },
          { opacity: 1, transform: "none" },
        ],
        180,
      );
    }
  }).observe(infoDialog, { attributes: true, attributeFilter: ["open"] });
}

const count = document.querySelector("#result-count");
if (count) {
  let previous = count.textContent;
  new MutationObserver(() => {
    if (count.textContent === previous) return;
    previous = count.textContent;
    animate(
      count,
      [
        { opacity: 0.35, transform: "translateY(3px)" },
        { opacity: 1, transform: "none" },
      ],
      220,
    );
  }).observe(count, { childList: true });
}

const configSummary = document.querySelector("#config-summary");
if (configSummary) {
  let lastHtml = configSummary.innerHTML;
  new MutationObserver(() => {
    if (configSummary.innerHTML === lastHtml) return;
    lastHtml = configSummary.innerHTML;
    triggerHeaderScan();
    triggerHudScan();
    configSummary.querySelectorAll("span").forEach((chip, index) => {
      animate(
        chip,
        [
          { opacity: 0.3, transform: "translateY(4px) scale(0.96)" },
          { opacity: 1, transform: "none" },
        ],
        220,
        Math.min(index, 5) * 18,
      );
    });
  }).observe(configSummary, { childList: true });
}

const cardList = document.querySelector("#cards");
function animateCardCharge(card) {
  card.querySelectorAll(".clearance-track > span").forEach((bar) => {
    bar.style.transformOrigin = "left center";
    animate(
      bar,
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      420,
      60,
    );
  });
}

// Observe each new card rather than playing offscreen cards before they are seen.
const reveal =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          let index = 0;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal.unobserve(entry.target);
            animate(
              entry.target,
              [
                {
                  opacity: 0.3,
                  transform: "translate3d(0, 12px, 0) scale(0.985)",
                },
                { opacity: 1, transform: "none" },
              ],
              280,
              Math.min(index++, 7) * 26,
            );
            if (entry.target.classList.contains("cooler-card")) {
              animateCardCharge(entry.target);
            }
          }
        },
        { threshold: 0.06 },
      )
    : null;

let observedCards = [];
function observeCards() {
  // Drop detached nodes on search/filter, including nodes never scrolled into view.
  observedCards.forEach((card) => reveal?.unobserve(card));
  observedCards = [...(cardList?.querySelectorAll(".cooler-card") || [])];
  observedCards.forEach((card) => reveal?.observe(card));
}
if (cardList) {
  observeCards();
  new MutationObserver(observeCards).observe(cardList, { childList: true });
}
document
  .querySelectorAll(
    ".principles > div, .review-method, .test-group, .video-entry",
  )
  .forEach((element) => reveal?.observe(element));

for (const selector of ["#test-groups", "#video-list"]) {
  const list = document.querySelector(selector);
  if (!list) continue;
  let observed = [];
  const refresh = () => {
    observed.forEach((element) => reveal?.unobserve(element));
    observed = [...list.children];
    observed.forEach((element) => reveal?.observe(element));
  };
  refresh();
  new MutationObserver(refresh).observe(list, { childList: true });
}

// A section stays available immediately on open; closing removes it after motion.
const sections = new Map();
export function setSectionVisible(element, visible) {
  const previous = sections.get(element);
  previous?.();
  if (element.hidden === !visible) return;
  if (reduced.matches || document.hidden) {
    element.hidden = !visible;
    return;
  }
  if (!visible && element.contains(document.activeElement))
    document
      .querySelector('[data-mode="quick"]')
      ?.focus({ preventScroll: true });
  const start = element.hidden ? 0 : element.getBoundingClientRect().height;
  element.hidden = false;
  const end = visible ? element.getBoundingClientRect().height : 0;
  const originalOverflow = element.style.overflow;
  element.style.overflow = "hidden";
  // Closed fields must stop accepting focus even during their closing transition.
  element.inert = !visible;
  let animation;
  const finish = () => {
    sections.delete(element);
    animation?.cancel();
    element.hidden = !visible;
    element.inert = false;
    element.style.overflow = originalOverflow;
  };
  sections.set(element, finish);
  animation = animate(
    element,
    [
      { height: `${start}px`, opacity: visible ? 0.35 : 1 },
      { height: `${end}px`, opacity: visible ? 1 : 0.35 },
    ],
    visible ? 320 : 220,
  );
  if (animation) animation.finished.then(finish, () => {});
  else finish();
}
const finishSections = () =>
  [...sections.values()].forEach((finish) => finish());
reduced.addEventListener("change", () => {
  if (reduced.matches) finishSections();
});
window.addEventListener("pagehide", finishSections);
window.addEventListener("beforeprint", finishSections);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) finishSections();
});

// Preserve transforms used for positioning fixed elements, such as the compare tray.
for (const selector of ["#compare-tray", "#toast"]) {
  const element = document.querySelector(selector);
  if (!element) continue;
  let hidden = element.hidden;
  new MutationObserver(() => {
    if (hidden === element.hidden) return;
    hidden = element.hidden;
    if (!hidden) {
      const base = getComputedStyle(element).transform;
      animate(
        element,
        [
          {
            opacity: 0,
            transform: `${base === "none" ? "" : base} translateY(18px)`,
          },
          { opacity: 1, transform: base },
        ],
        320,
      );
    }
  }).observe(element, { attributes: true, attributeFilter: ["hidden"] });
}

const compareItemsEl = document.querySelector("#compare-items");
if (compareItemsEl) {
  let prevCount = 0;
  new MutationObserver(() => {
    const items = [...compareItemsEl.children];
    if (items.length > prevCount && items.length > 0) {
      const newest = items[items.length - 1];
      animate(
        newest,
        [
          { opacity: 0, transform: "translateY(8px) scale(0.94)" },
          { opacity: 1, transform: "none" },
        ],
        220,
      );
    }
    prevCount = items.length;
  }).observe(compareItemsEl, { childList: true });
}

function bindNumericMetricObserver(element) {
  if (!element) return;
  let text = element.textContent.trim();
  new MutationObserver(() => {
    const next = element.textContent.trim();
    if (text === next) return;
    const prev = text;
    text = next;
    if (/^-?\d+$/.test(prev) && /^-?\d+$/.test(next)) {
      rollNumber(element, Number.parseInt(prev, 10), Number.parseInt(next, 10));
      triggerHudScan();
    } else {
      animate(
        element,
        [
          { opacity: 0.4, transform: "translateY(5px)" },
          { opacity: 1, transform: "none" },
        ],
        260,
      );
    }
  }).observe(element, { childList: true, characterData: true, subtree: true });
}

for (const selector of [
  "#answer-value",
  "#metric-candidates",
  "#metric-ready",
  "#metric-pending",
  "#metric-blocked",
]) {
  bindNumericMetricObserver(document.querySelector(selector));
}

const collectionStats = document.querySelector("#collection-stats");
if (collectionStats) {
  const bindStats = () => {
    collectionStats.querySelectorAll(".review-stat b").forEach((b) => {
      if (b.dataset.hudBound) return;
      b.dataset.hudBound = "1";
      animate(
        b,
        [
          { opacity: 0.25, transform: "translateY(6px)" },
          { opacity: 1, transform: "none" },
        ],
        320,
      );
      bindNumericMetricObserver(b);
    });
  };
  bindStats();
  new MutationObserver(bindStats).observe(collectionStats, { childList: true });
}

// Continue from the current press frame, with tactical shockwave pulse on key triggers.
const pressing = new Map();
function releaseButtons() {
  for (const [button, animation] of pressing) {
    const transform = getComputedStyle(button).transform;
    animation.cancel();
    animate(
      button,
      [{ transform }, { transform: "scale(1.015)" }, { transform: "none" }],
      280,
    );
  }
  pressing.clear();
}
document.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button:not(:disabled)");
  if (!button || event.button !== 0 || reduced.matches) return;
  releaseButtons();
  const animation = animate(
    button,
    [
      { transform: getComputedStyle(button).transform },
      { transform: "scale(.965)" },
    ],
    95,
  );
  if (animation) {
    animation.effect.updateTiming({ fill: "forwards" });
    pressing.set(button, animation);
  }
  if (
    button.matches(
      ".preset-pills button, .quick-hit, .next-chips button, .primary-button",
    )
  ) {
    animate(
      button,
      [
        { boxShadow: "0 0 0 0 var(--lightning-glow, rgba(233,196,91,.45))" },
        { boxShadow: "0 0 0 9px transparent" },
      ],
      360,
    );
  }
});
document.addEventListener("pointerup", releaseButtons);
document.addEventListener("pointercancel", releaseButtons);
window.addEventListener("blur", releaseButtons);
window.addEventListener("pagehide", releaseButtons);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseButtons();
});
reduced.addEventListener("change", () => {
  if (reduced.matches) releaseButtons();
});
