"use client";

import { useEffect, useState } from "react";
import { BackgroundLines } from "./BackgroundLines";
import { BackgroundVideo } from "./BackgroundVideo";

/**
 * Background layer plus a sticky top-right toggle between the looping
 * video and the original SVG line sweeps. The choice is remembered per
 * browser in localStorage. Default is the video.
 */
const STORAGE_KEY = "l33t-bg";

type Mode = "video" | "lines";

export function Background() {
  const [mode, setMode] = useState<Mode>("video");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "video" || saved === "lines") setMode(saved);
    } catch {
      // storage blocked: keep the default
    }
  }, []);

  function toggle() {
    const next: Mode = mode === "video" ? "lines" : "video";
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked: the choice lasts for this page view only
    }
  }

  return (
    <>
      {mode === "video" ? <BackgroundVideo /> : <BackgroundLines />}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={mode === "video"}
        aria-label={
          mode === "video"
            ? "switch to the static line background"
            : "switch to the video background"
        }
        title={
          mode === "video"
            ? "turn the video background off"
            : "turn the video background on"
        }
        className="bg-toggle mono-data fixed top-4 right-10 sm:top-5 sm:right-12 px-3 py-2 border transition-colors"
        style={{
          zIndex: 45,
          color: mode === "video" ? "var(--color-cyan)" : "var(--color-ink-muted)",
          background: "rgba(12, 19, 34, 0.72)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderColor:
            mode === "video"
              ? "color-mix(in oklab, var(--color-cyan) 40%, transparent)"
              : "var(--color-rule)",
          letterSpacing: "0.08em",
          fontSize: 11,
        }}
      >
        <span
          aria-hidden
          className="inline-block w-2 h-2 mr-2 align-middle border"
          style={{
            background: mode === "video" ? "var(--color-cyan)" : "transparent",
            borderColor:
              mode === "video" ? "var(--color-cyan)" : "var(--color-ink-muted)",
          }}
        />
        {mode === "video" ? "video bg: on" : "video bg: off"}
      </button>
    </>
  );
}
