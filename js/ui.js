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
function animate(element, frames, duration = 320, delay = 0) {
  if (reduced.matches || !element?.animate || document.hidden) return;
  const animation = element.animate(frames, {
    duration,
    delay,
    easing: "cubic-bezier(.16,1,.3,1)",
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
      ".site-header, .hero, .decision-toolbar, .review-intro, .config-panel, .results-top, .thermal-context, .result-metrics, .check-panel, .review-stats, .cooler-card",
    )
    .forEach((element, index) => {
      const box = element.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= innerHeight || box.height === 0) return;
      animate(
        element,
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        460,
        Math.min(index, 6) * 35,
      );
    });
}
const overlay = document.querySelector("#boot-screen");
const bootVideo = document.querySelector("#boot-video");
const skip = document.querySelector("#skip-intro");
const replay = document.querySelector("#replay-intro");
let bootTimer,
  stopBoot,
  previousFocus,
  held = [],
  bootActive = false;
const bootKey = "coolerguide-lightning-seen-v1";
function finishBoot() {
  if (!bootActive) return;
  bootActive = false;
  clearTimeout(bootTimer);
  stopBoot?.();
  stopBoot = null;
  overlay.hidden = true;
  held.forEach((node) => {
    node.inert = false;
  });
  held = [];
  document.body.style.overflow = "";
  try {
    localStorage.setItem(bootKey, "1");
  } catch {}
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  enterPage();
}
function startBoot(manual = false) {
  if (!overlay || !bootVideo || !skip || bootActive || document.hidden || (reduced.matches && !manual)) return;
  previousFocus = document.activeElement;
  held = [...document.body.children].filter(
    (node) => node !== overlay && !node.inert && node.tagName !== "SCRIPT",
  );
  held.forEach((node) => {
    node.inert = true;
  });
  bootActive = true;
  overlay.dataset.playback = "loading";
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  skip.focus({ preventScroll: true });
  // 手动重播给慢网留出缓冲时间。
  bootTimer = setTimeout(finishBoot, manual ? 30000 : 7000);
  stopBoot = startLightningBoot(bootVideo, finishBoot);
}
skip?.addEventListener("click", finishBoot);
replay?.addEventListener("click", () => startBoot(true));
document.addEventListener("keydown", (event) => {
  if (bootActive && event.key === "Escape") {
    event.preventDefault();
    finishBoot();
  }
});
function syncMotion() {
  if (replay) {
    replay.title = reduced.matches
      ? "减少动态效果已开启；点击可手动播放开场"
      : "重播 LIGHTNING 开场";
  }
  if (reduced.matches) {
    finishBoot();
    animations.forEach((animation) => animation.cancel());
  }
}
reduced.addEventListener("change", syncMotion);
syncMotion();
let seen = false;
try {
  seen = localStorage.getItem(bootKey) === "1";
} catch {}
if (
  overlay &&
  !seen &&
  !location.hash &&
  !reduced.matches &&
  new URLSearchParams(location.search).get("noanim") !== "1"
)
  startBoot();
else enterPage();
window.addEventListener("pagehide", finishBoot);
window.addEventListener("beforeprint", finishBoot);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    finishBoot();
    animations.forEach((animation) => animation.cancel());
  }
});

// Animate native disclosures without replacing their keyboard interaction.
const folding = new Map();
document.addEventListener("click", (event) => {
  const summary = event.target.closest("summary");
  if (!summary || reduced.matches || !summary.parentElement.animate) return;
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
    opening ? 340 : 220,
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
const infoDialog = document.querySelector("#info-dialog");
if (infoDialog)
  new MutationObserver(() => {
    if (infoDialog.open)
      animate(
        infoDialog,
        [
          { opacity: 0, transform: "translateY(8px) scale(.99)" },
          { opacity: 1, transform: "none" },
        ],
        240,
      );
  }).observe(infoDialog, { attributes: true, attributeFilter: ["open"] });
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

const cardList = document.querySelector("#cards");
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
                { opacity: 0.25, transform: "translateY(16px)" },
                { opacity: 1, transform: "none" },
              ],
              420,
              Math.min(index++, 5) * 40,
            );
          }
        },
        { threshold: 0.08 },
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
    visible ? 360 : 240,
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
        360,
      );
    }
  }).observe(element, { attributes: true, attributeFilter: ["hidden"] });
}
for (const selector of [
  "#answer-value",
  "#metric-candidates",
  "#metric-pending",
  "#metric-blocked",
]) {
  const element = document.querySelector(selector);
  if (!element) continue;
  let text = element.textContent;
  new MutationObserver(() => {
    if (text === element.textContent) return;
    text = element.textContent;
    animate(
      element,
      [
        { opacity: 0.4, transform: "translateY(5px)" },
        { opacity: 1, transform: "none" },
      ],
      280,
    );
  }).observe(element, { childList: true, characterData: true, subtree: true });
}

// Continue from the current press frame, like the calculator's spring feedback.
const pressing = new Map();
function releaseButtons() {
  for (const [button, animation] of pressing) {
    const transform = getComputedStyle(button).transform;
    animation.cancel();
    animate(
      button,
      [{ transform }, { transform: "scale(1.015)" }, { transform: "none" }],
      320,
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
    100,
  );
  if (animation) {
    animation.effect.updateTiming({ fill: "forwards" });
    pressing.set(button, animation);
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
