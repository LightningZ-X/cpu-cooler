import React from "react";
import {
  AbsoluteFill,
  Composition,
  Freeze,
  Html5Audio,
  OffthreadVideo,
  registerRoot,
  staticFile,
  useCurrentFrame,
} from "remotion";

const source = staticFile("lightningz-gap-cut-v2.mp4");
const videoFrames = 121;

function Opening() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="lightning-finish" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0 .78 .22 0 0 0 .17 0 .83 0 0 0 0 0 1 0"
            />
            {/* Smooth the smallest compression artifacts before enhancing local detail. */}
            <feGaussianBlur stdDeviation="0.5" result="clean" />
            <feGaussianBlur in="clean" stdDeviation="1.65" result="low-frequency" />
            <feComposite
              in="clean"
              in2="low-frequency"
              operator="arithmetic"
              k2="1.9"
              k3="-0.9"
            />
          </filter>
        </defs>
      </svg>
      {/* Hold the last original frame through the original soundtrack's short tail. */}
      <Freeze frame={videoFrames - 1} active={frame >= videoFrames}>
        <OffthreadVideo
          src={source}
          muted
          style={{ width: "100%", height: "100%", filter: "url(#lightning-finish)" }}
        />
      </Freeze>
      <Html5Audio src={source} />
    </AbsoluteFill>
  );
}

function Root() {
  return (
    <Composition
      id="LightningOpening"
      component={Opening}
      width={2560}
      height={1440}
      fps={30}
      durationInFrames={123}
    />
  );
}

registerRoot(Root);
