(function () {
  let theme;
  try {
    theme = localStorage.getItem("coolerguide-theme");
  } catch {}
  if (theme !== "light" && theme !== "dark")
    theme = matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  document.documentElement.dataset.theme = theme;
})();
