"use client";

/**
 * Full-bleed looping video background. Sits at the same z-index as the
 * SVG BackgroundLines layer so the two are interchangeable from
 * app/page.tsx. Muted + playsInline so mobile browsers allow autoplay.
 * A scrim sits on top so the prose keeps its contrast against whatever
 * the footage is doing. Respects prefers-reduced-motion via globals.css
 * (.bg-video is hidden there, leaving the flat midnight background).
 */
const SRC = "/L33t-background.mp4";

/** 0 = raw footage, 1 = fully midnight. */
const SCRIM_OPACITY = 0.55;

export function BackgroundVideo() {
  return (
    <div
      aria-hidden
      className="bg-video"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      <video
        src={SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--color-midnight)",
          opacity: SCRIM_OPACITY,
        }}
      />
    </div>
  );
}
