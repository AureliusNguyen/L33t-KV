"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadCore,
  encodeSet,
  type CoreHandle,
} from "@/lib/wasm/l33t-core";

const CLIENTS = 3;
const VALUE_SIZE_BYTES = 8;
const LINK_GBIT = 1; // 1 Gbit assumed link speed

// The slider is logarithmic. Loopback lives around ten microseconds,
// a lab LAN around eighty, a cloud region in the low milliseconds and a
// coast-to-coast link near sixty. A linear track in milliseconds put
// the whole interesting region (everything under a millisecond) inside
// the first pixel, so the default could never show the headline number.
const RTT_MIN_US = 10;
const RTT_MAX_US = 200_000;
const DEFAULT_RTT_US = 80;
const SLIDER_STEPS = 1000;
const LOG_RANGE = Math.log(RTT_MAX_US / RTT_MIN_US);

function sliderToUs(v: number): number {
  return RTT_MIN_US * Math.exp((v / SLIDER_STEPS) * LOG_RANGE);
}
function usToSlider(us: number): number {
  return Math.round((Math.log(us / RTT_MIN_US) / LOG_RANGE) * SLIDER_STEPS);
}

const PRESETS: { label: string; us: number }[] = [
  { label: "loopback", us: 10 },
  { label: "lab LAN", us: 80 },
  { label: "cloud region", us: 2_000 },
  { label: "coast to coast", us: 60_000 },
];

export function WasmRttSlider({ active }: { active?: boolean }) {
  const [core, setCore] = useState<CoreHandle | null>(null);
  const [cpuUs, setCpuUs] = useState<number | null>(null);
  const [slider, setSlider] = useState(() => usToSlider(DEFAULT_RTT_US));
  const [pulse, setPulse] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await loadCore(65536);
        if (!mounted) return;
        const measured = measureCpu(c);
        setCore(c);
        setCpuUs(measured);
      } catch (err) {
        console.error("wasm load failed", err);
        if (mounted) setLoadError(String(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Separate cleanup to guarantee the pulse timer never fires after unmount.
  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

  const bandwidthUs = useMemo(() => {
    // bandwidth time in us = bytes * 8 / (Gbit * 1000) microseconds
    const bytesPerOp = 3 + 8 + 2 + VALUE_SIZE_BYTES + 1; // request + ack
    return (bytesPerOp * 8) / (LINK_GBIT * 1000);
  }, []);

  const rttUs = sliderToUs(slider);
  const cpu = cpuUs ?? 5;
  const totalUs = cpu + bandwidthUs + rttUs;
  const throughput = Math.round((CLIENTS / totalUs) * 1e6);
  const bottleneck = pickBottleneck(cpu, bandwidthUs, rttUs);
  const ready = core !== null && cpuUs !== null;

  function setRtt(v: number) {
    setSlider(v);
    setPulse(true);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(false), 180);
  }

  return (
    <div
      className={`relative h-full overflow-auto border bg-[var(--color-midnight-2)] p-5 sm:p-6 transition-colors ${
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
      <div
        className="small mono mb-2"
        style={{ color: "var(--color-ink-muted)" }}
      >
        drag the RTT - watch what dominates
      </div>

      <div className="my-5">
        <div
          className="flex justify-between small mono"
          style={{ color: "var(--color-ink-muted)" }}
        >
          <span>{formatRtt(RTT_MIN_US)}</span>
          <span>{formatRtt(RTT_MAX_US)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={slider}
          onChange={(e) => setRtt(Number(e.target.value))}
          className="w-full mt-1 h-8"
          aria-label="Round-trip time"
          aria-valuetext={formatRtt(rttUs)}
        />
        <div
          className="mono-data mt-1 text-center"
          style={{ color: "var(--color-cyan)" }}
        >
          RTT {formatRtt(rttUs)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map((p) => {
          const isCurrent = Math.abs(rttUs - p.us) / p.us < 0.03;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => setRtt(usToSlider(p.us))}
              aria-pressed={isCurrent}
              className="mono-data text-xs px-2.5 py-1.5 border transition-colors hover:border-[color:var(--color-cyan)]/40"
              style={{
                color: isCurrent ? "var(--color-cyan)" : "var(--color-ink-muted)",
                borderColor: isCurrent
                  ? "color-mix(in oklab, var(--color-cyan) 40%, transparent)"
                  : "var(--color-rule)",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="my-6">
        <div
          className="small mono mb-2"
          style={{ color: "var(--color-ink-muted)" }}
        >
          estimated throughput
        </div>
        <div
          className="display-2 tabular-nums"
          style={{
            color: pulse ? "var(--color-cyan)" : "var(--color-ink)",
            transition: "color 180ms ease-out",
            fontVariationSettings: "\"opsz\" 144",
          }}
        >
          {ready ? throughput.toLocaleString() : "----"}
          <span
            className="mono-data ml-3"
            style={{ color: "var(--color-ink-muted)" }}
          >
            ops/sec
          </span>
        </div>
      </div>

      <div
        className="small mono mt-6 mb-3"
        style={{ color: "var(--color-ink-muted)" }}
      >
        per-op time = cpu + bandwidth + RTT. only RTT changes.
      </div>

      <div className="mono-data divide-y divide-[var(--color-rule)]">
        <Row
          label="cpu work"
          value={cpuUs !== null ? formatUs(cpuUs) : "(loading)"}
          note="measured once in WASM (constant)"
        />
        <Row
          label="bandwidth"
          value={formatUs(bandwidthUs)}
          note={`${VALUE_SIZE_BYTES} B value at ${LINK_GBIT} Gbit (constant)`}
        />
        <Row
          label="network RTT"
          value={formatUs(rttUs)}
          note="you control this"
          accent
        />
        <Row
          label="per op"
          value={ready ? formatUs(totalUs) : "(loading)"}
          note={`${CLIENTS} clients, one op in flight each`}
        />
      </div>

      <div className="mt-5 small mono">
        <span style={{ color: "var(--color-ink-muted)" }}>bottleneck: </span>
        <span style={{ color: "var(--color-cyan)" }}>{bottleneck}</span>
      </div>

      {loadError && (
        <div
          className="small mono mt-4"
          style={{ color: "var(--color-ink-muted)" }}
        >
          (failed to load wasm core: {loadError})
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-4">
        <span style={{ color: "var(--color-ink-muted)" }}>{label}</span>
        <span
          className="tabular-nums text-right"
          style={{ color: accent ? "var(--color-cyan)" : "var(--color-ink)" }}
        >
          {value}
        </span>
      </div>
      <div
        className="small mt-0.5"
        style={{ color: "var(--color-ink-muted)" }}
      >
        {note}
      </div>
    </div>
  );
}

/** Slider readout: whole microseconds below a millisecond, ms above. */
function formatRtt(us: number): string {
  if (us < 1000) return `${Math.round(us)} microsec`;
  const ms = us / 1000;
  return `${trimZero(ms.toFixed(ms < 10 ? 1 : 0))} ms`;
}

/**
 * Table readout: microseconds in every row so the eye can compare, with
 * just enough precision to show the two constant rows are not zero.
 * Trailing ".0" is dropped so the RTT row matches the slider readout.
 */
function formatUs(us: number): string {
  if (us < 1) return `${us.toFixed(2)} microsec`;
  if (us < 1000) return `${trimZero(us.toFixed(1))} microsec`;
  const ms = us / 1000;
  return `${trimZero(ms.toFixed(ms < 10 ? 1 : 0))} ms`;
}

function trimZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

function pickBottleneck(cpu: number, bw: number, rtt: number): string {
  const max = Math.max(cpu, bw, rtt);
  if (max === rtt) return "network";
  if (max === bw) return "bandwidth";
  return "cpu";
}

function measureCpu(core: CoreHandle): number {
  // Browser clock resolution (~1ms perf.now without COOP/COEP) makes
  // single-op timing useless. Batched timing: run 100k SETs in one WASM
  // call, divide by 100k. Take min of three runs to ignore JIT warmup
  // and other-tab interference.
  const set = encodeSet("key_1", "value_1");

  // Warm up the WASM JIT and the hashtable bucket.
  core.benchBatch(set, 50000);

  const ITERS = 100000;
  let bestNsPerOp = Number.POSITIVE_INFINITY;
  for (let run = 0; run < 3; run++) {
    const totalNs = core.benchBatch(set, ITERS);
    const nsPerOp = totalNs / ITERS;
    if (nsPerOp > 0 && nsPerOp < bestNsPerOp) bestNsPerOp = nsPerOp;
  }
  // Fallback: if every run came back as 0 (extremely throttled clock),
  // pretend it's 1us so the UI still makes sense.
  if (!Number.isFinite(bestNsPerOp) || bestNsPerOp <= 0) bestNsPerOp = 1000;

  // benchBatch ran in WASM but JIT can make WASM slightly faster than the
  // native C build (and the C build itself runs on more cores via epoll).
  // We DO show the live WASM number; we mark it as such in the UI.
  return bestNsPerOp / 1000; // microseconds
}
