"use client";

import { motion, useInView } from "motion/react";
import { useMemo, useRef, useState } from "react";

type Feature = {
  id: string;
  title: string;
  description: string;
  /** What l33t and Redis offer for this feature. */
  l33t: string;
  redis: string;
  /** Whether l33t supports this feature in its current form. */
  supported: boolean;
};

const FEATURES: Feature[] = [
  // Supported by l33t (positive checks)
  {
    id: "low-latency",
    title: "Sub-millisecond latency",
    description:
      "Reads and writes that finish faster than a frame on a 60Hz display. The kind of latency you want behind a cache.",
    l33t: "L33T KV: ~80 microsec avg, LAN ceiling",
    redis: "Redis: ~85 microsec avg, same setup",
    supported: true,
  },
  {
    id: "high-throughput",
    title: "High throughput on a LAN",
    description:
      "Tens of thousands of ops per second per node, sustained, against a real network.",
    l33t: "L33T KV: 36k ops/sec, 3 nodes",
    redis: "Redis: 35k ops/sec, 3 nodes",
    supported: true,
  },
  {
    id: "compact-wire",
    title: "Compact wire protocol",
    description:
      "Spend bytes on data, not on framing. Useful when the network is the bottleneck.",
    l33t: "L33T KV: 3 bytes of framing",
    redis: "Redis: 17-23 bytes (RESP)",
    supported: true,
  },
  {
    id: "auditable",
    title: "Auditable source",
    description:
      "Small enough that you can read every line that touches your data in an afternoon.",
    l33t: "L33T KV: ~400 lines of C",
    redis: "Redis: ~150k lines",
    supported: true,
  },

  // Missing in l33t (negative checks - drives verdict)
  {
    id: "persistence",
    title: "Persistence",
    description:
      "Survive a process crash without losing your data. The store rebuilds from disk on restart.",
    l33t: "L33T KV: none, RAM-only",
    redis: "Redis: AOF logs + RDB snapshots",
    supported: false,
  },
  {
    id: "replication",
    title: "Replication",
    description:
      "Run primaries with read replicas and promote a follower automatically when the primary dies.",
    l33t: "L33T KV: single node",
    redis: "Redis: primary/replica + Sentinel + Cluster",
    supported: false,
  },
  {
    id: "eviction",
    title: "Eviction under memory pressure",
    description:
      "Enforce a memory cap. When you hit it, drop old or rarely-used keys instead of refusing writes.",
    l33t: "L33T KV: silently fails when full",
    redis: "Redis: LRU, LFU, allkeys-lru, volatile-ttl",
    supported: false,
  },
  {
    id: "auth",
    title: "Auth and TLS",
    description:
      "Refuse unauthenticated connections. Encrypt the wire so untrusted networks can't read or modify ops.",
    l33t: "L33T KV: open port to anyone on LAN",
    redis: "Redis: ACLs + TLS + per-user permissions",
    supported: false,
  },
  {
    id: "observability",
    title: "Observability",
    description:
      "See latency percentiles, hit ratios, slow queries, eviction counts. Trace a slow request after the fact.",
    l33t: "L33T KV: no logs, no metrics",
    redis: "Redis: INFO, SLOWLOG, MONITOR, LATENCY",
    supported: false,
  },
  {
    id: "types",
    title: "Data types beyond bytes",
    description:
      "Hashes, lists, sets, sorted sets, streams, hyperloglogs, geo, bitmaps. Operations richer than get-and-set.",
    l33t: "L33T KV: bytes-to-bytes only",
    redis: "Redis: 9+ first-class data structures",
    supported: false,
  },
  {
    id: "tooling",
    title: "Everything else operations needs",
    description:
      "Expiration / TTL, pub/sub, Lua scripting, multi-key transactions, cluster mode, client tracking.",
    l33t: "L33T KV: none of it",
    redis: "Redis: 15 years of operational surface",
    supported: false,
  },
];

export function InteractiveTradeoffs() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Verdict counts only the SELECTED features that l33t doesn't have. A
  // user can check every supported feature and still get "l33t works for
  // you". The moment they check anything in the unsupported list, l33t is
  // the wrong tool.
  const totalSupported = FEATURES.filter((f) => f.supported).length;
  const totalMissing = FEATURES.length - totalSupported;
  const selectedSupported = useMemo(
    () =>
      FEATURES.filter((f) => f.supported && selected.has(f.id)).length,
    [selected]
  );
  const missingNeeded = useMemo(
    () =>
      FEATURES.filter((f) => !f.supported && selected.has(f.id)).length,
    [selected]
  );

  // The first checked sacrificed feature, used in the single-feature
  // verdict so the message names the actual feature instead of always
  // saying "persistence".
  const firstMissingChecked = useMemo(
    () => FEATURES.find((f) => !f.supported && selected.has(f.id)) ?? null,
    [selected]
  );

  const verdict = useMemo(() => {
    if (missingNeeded === 0 && selectedSupported === 0) {
      return {
        label: "Tell me what you need",
        color: "var(--color-ink)",
        sub: "Check the features your workload requires. The verdict updates live.",
      };
    }
    if (missingNeeded === 0) {
      return {
        label: "L33T KV works for you",
        color: "var(--color-cyan)",
        sub: `${selectedSupported} of ${totalSupported} L33T KV features needed, 0 sacrificed features needed. You can ship this.`,
      };
    }
    if (missingNeeded === 1 && firstMissingChecked) {
      return {
        label: "You need a real KV store",
        color: "var(--color-ink)",
        sub: `L33T KV doesn't have ${firstMissingChecked.title.toLowerCase()}. Adding it would mean rebuilding around it, which is what Redis already did.`,
      };
    }
    return {
      label: "You need Redis",
      color: "var(--color-ink)",
      sub: `${missingNeeded} sacrificed features needed. The gap between L33T KV and Redis is the gap between a benchmark and a production service.`,
    };
  }, [
    missingNeeded,
    selectedSupported,
    totalSupported,
    firstMissingChecked,
  ]);

  return (
    <div ref={ref} className="mt-4">
      <div
        className="small mono mb-6"
        style={{ color: "var(--color-ink-muted)" }}
      >
        check each feature you would need in production. the verdict updates live.
      </div>

      <div
        className="small mono mb-4 flex flex-wrap gap-x-5 gap-y-1"
        style={{ color: "var(--color-ink-muted)" }}
      >
        <span>
          <span
            aria-hidden
            className="inline-block w-2 h-2 mr-2 align-middle"
            style={{ background: "var(--color-cyan)" }}
          />
          L33T has it
        </span>
        <span>
          <span
            aria-hidden
            className="inline-block w-2 h-2 mr-2 align-middle border"
            style={{ borderColor: "var(--color-ink-muted)" }}
          />
          L33T lacks it
        </span>
      </div>

      <div>
        {FEATURES.map((f, i) => {
          const isOn = selected.has(f.id);
          const dotColor = f.supported
            ? "var(--color-cyan)"
            : "transparent";
          const dotBorder = f.supported ? "transparent" : "var(--color-ink-muted)";
          return (
            <motion.button
              key={f.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.04 * i, ease: "easeOut" }}
              onClick={() => toggle(f.id)}
              aria-pressed={isOn}
              className="w-full text-left group focus:outline-none"
            >
              {/* Colors and the hover glow live in globals.css under
                  .tradeoff-row so hover can drive them; inline styles
                  would win over :hover rules. */}
              <div
                className="tradeoff-row grid grid-cols-[28px_1fr] sm:grid-cols-[28px_minmax(200px,260px)_1fr] gap-x-4 gap-y-1 items-start py-3 px-3 -mx-3"
                data-on={isOn ? "true" : "false"}
                data-accent={f.supported ? "cyan" : "dim"}
              >
                <Checkbox checked={isOn} accent={f.supported} />
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    aria-hidden
                    className="tradeoff-dot inline-block w-2 h-2 mt-[6px] shrink-0 border"
                    style={{
                      background: dotColor,
                      borderColor: dotBorder,
                    }}
                  />
                  <div
                    className="tradeoff-title mono-data uppercase tracking-wider leading-snug"
                    style={{
                      letterSpacing: "0.08em",
                      wordBreak: "break-word",
                    }}
                  >
                    {f.title}
                  </div>
                </div>
                <div className="col-start-2 sm:col-start-3 sm:row-start-1">
                  <p
                    className="body"
                    style={{ color: "var(--color-ink-dim)" }}
                  >
                    {f.description}
                  </p>
                  <motion.div
                    initial={false}
                    animate={{
                      height: isOn ? "auto" : 0,
                      opacity: isOn ? 1 : 0,
                      marginTop: isOn ? 6 : 0,
                    }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <p
                      className="small mono"
                      style={{ color: "var(--color-cyan)" }}
                    >
                      {f.l33t}
                      <span style={{ color: "var(--color-ink-muted)" }}>
                        {" / "}
                        {f.redis}
                      </span>
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        layout
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mt-8 border bg-[var(--color-midnight-2)] p-5 sm:p-6"
        style={{
          borderColor:
            missingNeeded === 0 && selectedSupported > 0
              ? "var(--color-cyan)"
              : "var(--color-rule)",
          transition: "border-color 240ms ease-out",
        }}
      >
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="small mono"
              style={{ color: "var(--color-ink-muted)" }}
            >
              L33T KV strengths you need
            </span>
            <span
              className="mono-data tabular-nums"
              style={{ color: "var(--color-cyan)" }}
            >
              {selectedSupported}
              <span style={{ color: "var(--color-ink-muted)" }}>
                {" of "}
                {totalSupported}
              </span>
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="small mono"
              style={{ color: "var(--color-ink-muted)" }}
            >
              L33T KV gaps you need
            </span>
            <span
              className="mono-data tabular-nums"
              style={{
                color:
                  missingNeeded > 0
                    ? "var(--color-ink)"
                    : "var(--color-ink-muted)",
              }}
            >
              {missingNeeded}
              <span style={{ color: "var(--color-ink-muted)" }}>
                {" of "}
                {totalMissing}
              </span>
            </span>
          </div>
        </div>
        <div
          className="display-2 mt-3"
          style={{
            color: verdict.color,
            transition: "color 240ms ease-out",
          }}
        >
          {verdict.label}.
        </div>
        <div
          className="body mt-3"
          style={{ color: "var(--color-ink-dim)" }}
        >
          {verdict.sub}
        </div>
      </motion.div>
    </div>
  );
}

function Checkbox({
  checked,
  accent = true,
}: {
  checked: boolean;
  accent?: boolean;
}) {
  const fillColor = accent ? "var(--color-cyan)" : "var(--color-ink-dim)";
  return (
    <div
      className="tradeoff-check relative h-5 w-5 mt-[2px] shrink-0 border"
      style={{
        borderColor: checked ? fillColor : undefined,
        background: checked ? fillColor : "transparent",
      }}
    >
      <motion.svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        style={{ position: "absolute", inset: 0 }}
        initial={false}
        animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <path
          d="M4 10.5 L8.5 14.5 L16 6"
          stroke="var(--color-midnight)"
          strokeWidth="2.6"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </motion.svg>
    </div>
  );
}
