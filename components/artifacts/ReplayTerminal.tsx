"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TerminalLine = {
  /** Prompt prefix, e.g., "root@l33t:~$ ". Empty for output lines. */
  prompt?: string;
  /** Text to type. */
  text: string;
  /** Color override for the text portion (defaults to ink). */
  color?: string;
  /** Delay before typing this line begins (ms). Only used in auto-type mode. */
  delay?: number;
};

const NOT_STARTED = Symbol("not-started");

type Props = {
  lines: TerminalLine[];
  /** Characters typed per second when auto-typing. */
  speed?: number;
  /** Restart key for auto-type mode (changes re-run the animation). */
  restartKey?: string | number;
  /**
   * 0..1 scroll-driven progress. When provided, the terminal renders chars
   * proportional to progress instead of auto-typing on mount.
   */
  progress?: number;
  /** True if this terminal is the currently active artifact (drives glow). */
  active?: boolean;
};

export function ReplayTerminal({
  lines,
  speed = 80,
  restartKey,
  progress,
  active,
}: Props) {
  const totalChars = useMemo(
    () => lines.reduce((sum, l) => sum + l.text.length, 0),
    [lines]
  );
  const isScrollDriven = progress !== undefined;

  // Auto-type mode state
  const [autoRendered, setAutoRendered] = useState<string[]>(() =>
    lines.map(() => "")
  );
  const [autoActiveLine, setAutoActiveLine] = useState(0);
  // Sentinel rather than undefined: with no restartKey supplied, an
  // undefined initial value would equal the undefined key and the
  // auto-type effect would bail before typing a single character.
  const startedRef = useRef<string | number | undefined | symbol>(NOT_STARTED);

  // Scroll-driven mode: optional override progress driven by the "play"
  // button. When non-null, the effective progress is the max of the scroll
  // progress and this override. Once a play has completed (override = 1),
  // the terminal stays full even if the user scrolls back up.
  const [override, setOverride] = useState<number | null>(null);
  const playRafRef = useRef<number | null>(null);

  const effectiveProgress = isScrollDriven
    ? Math.max(progress ?? 0, override ?? 0)
    : 0;

  const play = useCallback(() => {
    if (!isScrollDriven) return;
    if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
    const start = performance.now();
    const from = effectiveProgress;
    // Shorter animation if we're already mostly there.
    const dur = Math.max(380, 1100 * (1 - from));
    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 2);
      const value = from + (1 - from) * eased;
      setOverride(value);
      if (t < 1) {
        playRafRef.current = requestAnimationFrame(tick);
      } else {
        playRafRef.current = null;
      }
    }
    playRafRef.current = requestAnimationFrame(tick);
  }, [effectiveProgress, isScrollDriven]);

  useEffect(() => {
    return () => {
      if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
    };
  }, []);

  // Auto-type effect (only runs when not scroll-driven)
  useEffect(() => {
    if (isScrollDriven) return;
    if (startedRef.current === restartKey) return;
    startedRef.current = restartKey;
    setAutoRendered(lines.map(() => ""));
    setAutoActiveLine(0);

    const charMs = 1000 / speed;
    let cancelled = false;

    (async () => {
      for (let i = 0; i < lines.length; i++) {
        if (cancelled) return;
        const line = lines[i];
        if (line.delay) await sleep(line.delay);
        setAutoActiveLine(i);
        if (line.text.length === 0) continue;
        for (let j = 1; j <= line.text.length; j++) {
          if (cancelled) return;
          setAutoRendered((prev) => {
            const next = [...prev];
            next[i] = line.text.slice(0, j);
            return next;
          });
          await sleep(charMs);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lines, speed, restartKey, isScrollDriven]);

  // Compute rendered lines for scroll-driven mode
  const { renderedLines, activeLine, isCursorOn } = useMemo(() => {
    if (!isScrollDriven) {
      return {
        renderedLines: autoRendered,
        activeLine: autoActiveLine,
        isCursorOn: true,
      };
    }
    const charsToShow = Math.floor(totalChars * effectiveProgress);
    let remaining = charsToShow;
    const next: string[] = [];
    let activeIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const len = lines[i].text.length;
      if (remaining <= 0) {
        next.push("");
        continue;
      }
      if (remaining >= len) {
        next.push(lines[i].text);
        remaining -= len;
        activeIdx = i;
      } else {
        next.push(lines[i].text.slice(0, remaining));
        activeIdx = i;
        remaining = 0;
      }
    }
    return {
      renderedLines: next,
      activeLine: activeIdx,
      isCursorOn: charsToShow > 0 && charsToShow < totalChars,
    };
  }, [
    isScrollDriven,
    effectiveProgress,
    totalChars,
    lines,
    autoRendered,
    autoActiveLine,
  ]);

  // Show the play button only in scroll-driven mode AND when typing isn't
  // already at 100%. Stays hidden once the terminal is fully revealed.
  const showPlay = isScrollDriven && effectiveProgress < 0.999;

  return (
    <div
      className={`relative h-full overflow-auto border bg-[var(--color-midnight-2)] p-5 scanlines transition-colors ${
        active
          ? "border-[color:var(--color-cyan)]/40"
          : "border-[var(--color-rule)]"
      }`}
      style={{
        boxShadow: active
          ? "0 0 0 1px rgba(95,217,245,0.18), 0 0 48px -16px rgba(95,217,245,0.35)"
          : "none",
        transition: "box-shadow 240ms ease-out, border-color 240ms ease-out",
      }}
    >
      {/* Active trace - thin cyan line at the top edge that fades in when active */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, var(--color-cyan), transparent)",
          opacity: active ? 0.8 : 0,
          transition: "opacity 320ms ease-out",
        }}
      />

      {showPlay && (
        <button
          type="button"
          onClick={play}
          aria-label="play the typing animation to the end"
          className="absolute top-3 right-3 mono-data px-2.5 py-1 border border-[var(--color-rule)] hover:border-[color:var(--color-cyan)]/40 transition-colors"
          style={{
            color: "var(--color-ink-muted)",
            background: "rgba(12, 19, 34, 0.7)",
            letterSpacing: "0.08em",
            fontSize: 11,
          }}
        >
          {"▸ play"}
        </button>
      )}

      <pre className="mono-body whitespace-pre-wrap leading-relaxed">
        {lines.map((line, i) => {
          const typed = renderedLines[i] ?? "";
          const isLineActive = i === activeLine;
          const isLineComplete = typed.length === line.text.length;
          const showCursor =
            isLineActive && (!isLineComplete || (isScrollDriven && isCursorOn));
          // Commands (lines with a prompt) render in full ink. Output lines
          // (no prompt) render in ink-dim by default so they read as the
          // terminal's response rather than a typed command. Explicit color
          // overrides on the TerminalLine still win.
          const defaultTextColor = line.prompt
            ? "var(--color-ink)"
            : "var(--color-ink-dim)";
          return (
            <div key={i}>
              {line.prompt && (
                <span style={{ color: "var(--color-ink-muted)" }}>
                  {line.prompt}
                </span>
              )}
              <span style={{ color: line.color ?? defaultTextColor }}>
                {typed}
              </span>
              {showCursor && <span className="cursor">_</span>}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
