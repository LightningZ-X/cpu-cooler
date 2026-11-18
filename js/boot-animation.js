/** Play the Remotion export directly so the browser scales the decoded frames only once. */
export function startLightningBoot(video, onEnd) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  function finish(reason) {
    if (listeners.signal.aborted) return;
    video.dataset.playback = reason;
    onEnd(reason);
  }
  video.addEventListener("playing", () => {
    video.dataset.playback = "playing";
  }, options);
  video.addEventListener("ended", () => finish("ended"), options);
  video.addEventListener("error", () => finish("error"), options);
  video.dataset.playback = "loading";
  video.muted = true;
  video.src = video.dataset.video;
  video.play().catch(() => finish("play-rejected"));
  return () => {
    listeners.abort();
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (["loading", "playing"].includes(video.dataset.playback))
      video.dataset.playback = "skipped";
  };
}
