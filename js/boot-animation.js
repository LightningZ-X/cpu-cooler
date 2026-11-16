/** Same video-to-canvas rendering as the PSU calculator; the original video is unchanged. */
export function startLightningBoot(canvas, onEnd) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    queueMicrotask(onEnd);
    return () => {};
  }
  const video = document.createElement("video");
  let stopped = false,
    raf = 0;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "");
  canvas.bootVideo = video;
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (video.readyState < 2) return;
    const scale = Math.min(
      canvas.width / video.videoWidth,
      canvas.height / video.videoHeight,
    );
    const width = video.videoWidth * scale,
      height = video.videoHeight * scale;
    ctx.drawImage(
      video,
      (canvas.width - width) / 2,
      (canvas.height - height) / 2,
      width,
      height,
    );
    canvas.dataset.frame = (video.currentTime * 30).toFixed(2);
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    const density = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(box.width * density));
    canvas.height = Math.max(1, Math.round(box.height * density));
    draw();
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.visualViewport?.removeEventListener("resize", resize);
    observer?.disconnect();
    video.pause();
    video.removeAttribute("src");
    video.load();
    delete canvas.bootVideo;
  }
  function finish(reason) {
    if (stopped) return;
    canvas.dataset.playback = reason;
    stop();
    onEnd();
  }
  function frame() {
    if (stopped) return;
    draw();
    raf = requestAnimationFrame(frame);
  }
  const observer =
    typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  resize();
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  observer?.observe(canvas);
  video.addEventListener("playing", () => {
    canvas.dataset.playback = "playing";
  });
  video.addEventListener("ended", () => finish("ended"));
  video.addEventListener("error", () => finish("error"));
  canvas.dataset.playback = "loading";
  video.src = canvas.dataset.video;
  raf = requestAnimationFrame(frame);
  video.play().catch(() => finish("play-rejected"));
  return stop;
}
