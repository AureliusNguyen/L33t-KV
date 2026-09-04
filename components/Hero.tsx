"use client";

import { motion } from "motion/react";

const TITLE = "L33T KV";
const DEK =
  "A KV store that beats Redis 6.0. Ranked 1/40 grad students in a KV store competition.";

const EASE = [0.2, 0.8, 0.2, 1] as const;

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-24 sm:py-28 max-w-[1280px] mx-auto">
      {/* Desktop: title + terminal on the left, the leaderboard on the
          right spanning both rows. Phone: title, dek, leaderboard,
          then the terminal, so the proof is the second thing seen. */}
      <div className="grid grid-cols-1 lg:grid-cols-[54fr_46fr] gap-x-16 gap-y-10 lg:items-center">
        <div className="lg:col-start-1">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease: EASE }}
            className="display-1 max-w-[14ch]"
          >
            {TITLE}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.22, ease: EASE }}
            className="lede mt-8 max-w-[48ch]"
            style={{ textWrap: "balance" }}
          >
            {DEK}
          </motion.p>
        </div>

        <motion.figure
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.4, ease: EASE }}
          className="lg:col-start-2 lg:row-start-1 lg:row-span-2 m-0"
        >
          <div
            className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 small mono mb-3"
            style={{ color: "var(--color-ink-muted)" }}
          >
            <span>class leaderboard, final ranking</span>
            <span
              className="shrink-0 whitespace-nowrap"
              style={{ color: "var(--color-cyan)" }}
            >
              rank 1/40 grad students
            </span>
          </div>
          <div
            className="border bg-white p-2 sm:p-3"
            style={{
              borderColor:
                "color-mix(in oklab, var(--color-cyan) 40%, transparent)",
              boxShadow:
                "0 0 0 1px rgba(95,217,245,0.18), 0 24px 48px -20px rgba(0,0,0,0.7), 0 0 64px -24px rgba(95,217,245,0.35)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/leaderboard.png"
              alt="Class leaderboard for KV performance. First row: Jeffery Hu and Leo Nguyen, 36,200 ops/sec, 0.08 ms average latency, ranked 1st. Second place 27,000 ops/sec, third place 15,000 ops/sec."
              width={1656}
              height={1376}
              fetchPriority="high"
              className="w-full h-auto block"
            />
          </div>
          <figcaption
            className="small mono mt-3"
            style={{ color: "var(--color-ink-muted)" }}
          >
            36,200 ops/sec, 0.08 ms avg latency. 34 percent ahead of
            second place.
          </figcaption>
        </motion.figure>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.55, ease: EASE }}
          className="lg:col-start-1 max-w-[640px]"
        >
          <HeroTerminal />
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 1.15 }}
        className="small mono mt-16 sm:mt-20 max-w-[96ch]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Four iterations and the true bottleneck discovery.
      </motion.p>
    </section>
  );
}

function HeroTerminal() {
  return (
    <div className="border border-[var(--color-rule)] bg-[var(--color-midnight-2)] p-4 sm:p-6 scanlines">
      {/* pre-wrap so the command line folds on a phone instead of
          forcing a horizontal scroll inside the box */}
      <pre className="mono-body leading-relaxed whitespace-pre-wrap">
        <span style={{ color: "var(--color-ink-muted)" }}>root@l33t:~$ </span>
        <span>./bench --servers 3 --ops 300000</span>
        {"\n\n"}
        <span style={{ color: "var(--color-ink-dim)" }}>throughput   </span>
        <span style={{ color: "var(--color-cyan)" }}>36,234 ops/sec</span>
        {"\n"}
        <span style={{ color: "var(--color-ink-dim)" }}>avg latency  0.080 ms</span>
        {"\n"}
        <span style={{ color: "var(--color-ink-dim)" }}>redis 6.0    35,670 ops/sec</span>
        {"\n"}
        <span style={{ color: "var(--color-ink-dim)" }}>rank         </span>
        <span style={{ color: "var(--color-ink)" }}>1/40 grad students</span>
        {"\n\n"}
        <span style={{ color: "var(--color-ink-muted)" }}>root@l33t:~$ </span>
        <span className="cursor">_</span>
      </pre>
    </div>
  );
}
