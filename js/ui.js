const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
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
    ?.setAttribute("content", theme === "dark" ? "#121212" : "#f5f5f5");
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
      ".hero, .review-intro, .config-panel, .results-top, .check-panel, .review-stats",
    )
    .forEach((element, index) =>
      animate(
        element,
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        460,
        index * 35,
      ),
    );
}
const overlay = document.querySelector("#boot-screen");
const video = document.querySelector("#boot-video");
const skip = document.querySelector("#skip-intro");
const replay = document.querySelector("#replay-intro");
let bootTimer,
  previousFocus,
  held = [],
  bootActive = false;
const bootKey = "coolerguide-lightning-seen-v1";
function finishBoot() {
  if (!bootActive) return;
  bootActive = false;
  clearTimeout(bootTimer);
  video.pause();
  video.removeAttribute("src");
  video.load();
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
  if (!overlay || bootActive || (reduced.matches && !manual)) return;
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
  video.src = "assets/lightningz-gap-cut-v2.mp4";
  bootTimer = setTimeout(finishBoot, 7000);
  video.play().catch(() => {
    overlay.dataset.playback = "play-rejected";
    finishBoot();
  });
}
video?.addEventListener("playing", () => {
  overlay.dataset.playback = "playing";
});
video?.addEventListener("ended", () => {
  overlay.dataset.playback = "ended";
  finishBoot();
});
video?.addEventListener("error", () => {
  overlay.dataset.playback = `error-${video.error?.code ?? "unknown"}`;
  finishBoot();
});
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
if (cardList)
  new MutationObserver(() => {
    cardList.querySelectorAll(".cooler-card").forEach((card, index) => {
      if (index < 4)
        animate(
          card,
          [
            { opacity: 0.5, transform: "translateY(5px)" },
            { opacity: 1, transform: "none" },
          ],
          240,
          index * 25,
        );
    });
  }).observe(cardList, { childList: true });
