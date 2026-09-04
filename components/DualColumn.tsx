"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Single-column on mobile (< lg). We render artifacts inline below their
// prose section there because the sticky right-stage layout collapses.
// matchMedia chosen over CSS-only `lg:hidden` to avoid double-mounting
// every artifact (WASM, RAF loops, IntersectionObservers) on desktop.
function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

export type SectionId =
  | "setup"
  | "ceiling-1-python"
  | "ceiling-2-uvloop"
  | "ceiling-3-epoll"
  | "redis-comparison"
  | "ceiling-4-iouring";

export type ArtifactProps = {
  /** 0..1 scroll progress through this section. */
  progress: number;
  /** True if this artifact is the currently active one in the sticky stage. */
  active: boolean;
};

/** Section ids whose right-column artifact types in lockstep with scroll. */
const SCROLL_HEAVY = new Set<SectionId>([
  "ceiling-1-python",
  "ceiling-2-uvloop",
  "ceiling-4-iouring",
]);

type Props = {
  sections: { id: SectionId; node: ReactNode }[];
  /**
   * Per-section artifact renderers. Receive scroll progress + active state
   * so terminals can sync their typing to user scroll.
   */
  artifacts: Record<SectionId, (props: ArtifactProps) => ReactNode>;
};

export function DualColumn({ sections, artifacts }: Props) {
  const [active, setActive] = useState<SectionId>(sections[0].id);
  const progressRef = useRef<Record<SectionId, number>>(
    sections.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {} as Record<SectionId, number>)
  );
  const [, setRerender] = useState(0);
  const isMobile = useIsMobile();

  // Active-section detection
  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => e !== null);
    if (elements.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const closest = visible.reduce((a, b) =>
          Math.abs(a.boundingClientRect.top) <
          Math.abs(b.boundingClientRect.top)
            ? a
            : b
        );
        setActive(closest.target.id as SectionId);
      },
      // Tighter band high on the viewport so a section in the
      // upper-middle wins active, and the next section has to
      // climb further before it can displace it. Combined with the
      // taller scroll-heavy sections this gives the completed
      // terminal a long linger before the crossfade.
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    elements.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [sections]);

  // Scroll-driven progress for ALL sections (not just the active one) so
  // sections the user scrolls quickly past converge to progress=1 instead
  // of getting stuck mid-typing.
  useEffect(() => {
    let frame = 0;
    function compute() {
      const vh = window.innerHeight;
      const triggerOffset = vh * 0.2;
      const next: Record<SectionId, number> = { ...progressRef.current };
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const scrolledPast = triggerOffset - rect.top;
        const linear = Math.max(0, Math.min(1, scrolledPast / rect.height));
        // Finish typing inside the first FINISH_AT of the section then sit
        // at progress=1 for the remainder so the result lingers while the
        // reader finishes the prose and the next ceiling enters view.
        // Inside the typing window, apply a power curve for soft start.
        const FINISH_AT = 0.4;
        const eased =
          linear < FINISH_AT
            ? Math.pow(linear / FINISH_AT, 1.8)
            : 1;
        next[s.id] = eased;
      }
      // Only force a re-render if at least one section's progress actually
      // moved by a meaningful amount. Saves 6 artifact reconciliations per
      // animation frame when the user is sitting on a section reading.
      const prev = progressRef.current;
      let changed = false;
      for (const s of sections) {
        if (Math.abs((next[s.id] ?? 0) - (prev[s.id] ?? 0)) > 0.004) {
          changed = true;
          break;
        }
      }
      progressRef.current = next;
      if (changed) setRerender((n) => n + 1);
    }
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    }
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  return (
    <div className="relative max-w-[1280px] mx-auto px-6 sm:px-12 lg:px-16">
      <div className="grid grid-cols-1 lg:grid-cols-[58fr_42fr] gap-12 lg:gap-20">
        <div className="space-y-24 sm:space-y-32 lg:space-y-40">
          {sections.map((s) => {
            const heavy = SCROLL_HEAVY.has(s.id);
            return (
              <div
                key={s.id}
                id={s.id}
                className={
                  // Scroll-driven terminal sections get extra vertical
                  // real estate on desktop so the typing has room to
                  // play out as the reader works through the prose.
                  heavy ? "lg:min-h-[200vh]" : ""
                }
              >
                {/* In scroll-heavy sections we sticky-pin the prose so
                    the reader doesn't lose context while scrolling
                    through the section's vertical budget. Matches the
                    right column's sticky stage. Sticky releases when
                    the section bottom hits the prose bottom. */}
                <div
                  className={
                    heavy ? "lg:sticky lg:top-20 lg:self-start" : ""
                  }
                >
                  {s.node}
                </div>
                {/* Phone layout: the artifact sits directly under its
                    prose, fully revealed (progress 1), sized to its
                    content instead of the desktop stage height so a
                    six-line terminal does not leave a screenful of
                    empty box. */}
                {isMobile && (
                  <div className="mt-10 min-h-[260px]">
                    {artifacts[s.id]({ progress: 1, active: true })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!isMobile && (
          <aside className="hidden lg:block">
            <div className="sticky top-20 h-[min(78vh,620px)]">
              <ArtifactStage
                active={active}
                artifacts={artifacts}
                progresses={progressRef.current}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ArtifactStage({
  active,
  artifacts,
  progresses,
}: {
  active: SectionId;
  artifacts: Record<SectionId, (props: ArtifactProps) => ReactNode>;
  progresses: Record<SectionId, number>;
}) {
  return (
    <div className="relative h-full">
      {(Object.keys(artifacts) as SectionId[]).map((id) => {
        const isActive = id === active;
        const node = artifacts[id]({
          progress: progresses[id] ?? 0,
          active: isActive,
        });
        return (
          <div
            key={id}
            aria-hidden={!isActive}
            style={{
              position: "absolute",
              inset: 0,
              opacity: isActive ? 1 : 0,
              transform: `translateY(${isActive ? 0 : 8}px)`,
              transition: "opacity 200ms ease-out, transform 200ms ease-out",
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            {node}
          </div>
        );
      })}
    </div>
  );
}
