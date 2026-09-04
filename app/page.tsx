"use client";

import { Hero } from "@/components/Hero";
import { ReadingProgress } from "@/components/ReadingProgress";
import { BackgroundLines } from "@/components/BackgroundLines";
import {
  DualColumn,
  type SectionId,
  type ArtifactProps,
} from "@/components/DualColumn";
import { ProseSection, CountUp } from "@/components/LeftProse";
import { ReplayTerminal, type TerminalLine } from "@/components/artifacts/ReplayTerminal";
import { ValueSweepChart } from "@/components/artifacts/ValueSweepChart";
import { IoUringNullResult } from "@/components/artifacts/IoUringNullResult";
import { WasmRttSlider } from "@/components/artifacts/WasmRttSlider";
import { InteractiveSetup } from "@/components/artifacts/InteractiveSetup";
import { InteractiveTradeoffs } from "@/components/InteractiveTradeoffs";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { Lesson } from "@/components/Lesson";
import { Glossary } from "@/components/Glossary";

const FNV1A_C = `static inline uint64_t fnv1a(const char* data, size_t len) {
    uint64_t h = 14695981039346656037ULL;
    for (size_t i = 0; i < len; i++) {
        h ^= (uint8_t)data[i];
        h *= 1099511628211ULL;
    }
    return h;
}`;

const PYTHON_LINES: TerminalLine[] = [
  { prompt: "root@l33t:~$ ", text: "./l33t-server.py --port 8080 &" },
  { prompt: "root@l33t:~$ ", text: "./l33t-benchmark.py --threads 3 --ops 100000" },
  { prompt: "", text: "" },
  { prompt: "", text: "throughput   13,420 ops/sec", color: "var(--color-cyan)" },
  { prompt: "", text: "avg latency  0.220 ms" },
  { prompt: "", text: "p99 latency  0.480 ms" },
];

const UVLOOP_LINES: TerminalLine[] = [
  { prompt: "root@l33t:~$ ", text: "pip install uvloop" },
  { prompt: "root@l33t:~$ ", text: "./l33t-server.py --loop uvloop --port 8080 &" },
  { prompt: "root@l33t:~$ ", text: "./l33t-benchmark.py --threads 3 --ops 100000" },
  { prompt: "", text: "" },
  { prompt: "", text: "throughput   31,200 ops/sec", color: "var(--color-cyan)" },
  { prompt: "", text: "avg latency  0.094 ms" },
];

export default function Home() {
  const sections: { id: SectionId; node: React.ReactNode }[] = [
    {
      id: "setup",
      node: (
        <ProseSection
          heading="The setup"
          lede="A 19-byte binary instead of human-readable text."
        >
          <p className="body">
            A key-value store is a brutally simple thing. Two verbs:
            SET and GET. The interface is so small that almost all of the
            cost lives in the wire and the network.
          </p>
          <p className="body">
            Most KV stores reach for Redis&apos;s RESP, a human-readable text
            protocol that costs seventeen to twenty-three bytes of framing
            per op. L33T spends three. One byte for the opcode, two bytes
            for a big-endian length, then the payload. The receiver is a
            machine. Humans don&apos;t need to read it.
          </p>
          <p className="body" style={{ color: "var(--color-ink-dim)" }}>
            Try it. The panel beside this text, or below it on a phone,
            runs your command through the same WASM-compiled parser the
            server uses. Click Run and watch it break the bytes apart.
          </p>
        </ProseSection>
      ),
    },
    {
      id: "ceiling-1-python",
      node: (
        <ProseSection
          number="01"
          heading="Python asyncio"
          lede="The reference baseline. Whatever you do next, you compare against this."
        >
          <p className="body">
            Vanilla asyncio, dict-backed store, one server per port behind
            a client-side modulo shard. Three shards, three benchmark
            threads, one hundred thousand ops each. Sync per op, no
            pipelining. The numbers come back honest.
          </p>
          <p className="body">
            Result: <CountUp value={13420} suffix="ops/sec" />.
          </p>
          <p className="body" style={{ color: "var(--color-ink-dim)" }}>
            Everything that follows is an argument about where the missing
            throughput went.
          </p>
        </ProseSection>
      ),
    },
    {
      id: "ceiling-2-uvloop",
      node: (
        <ProseSection
          number="02"
          heading="uvloop + tightened Python"
          lede="Swap the event loop. Cache the struct. Local-bind the hot-path globals."
        >
          <p className="body">
            uvloop swaps asyncio&apos;s event loop for one built on
            libuv. The wire format stays the same and the loop just
            dispatches faster. After that comes a round of tightening:
            cache the struct.Struct so it is parsed once, use
            readexactly instead of a hand-rolled read loop, and
            local-bind the hot-path globals so the bytecode emits
            LOAD_FAST instead of LOAD_GLOBAL.
          </p>
          <p className="body">
            Result: <CountUp value={31200} suffix="ops/sec" />. A 2.3x lift
            without leaving Python.
          </p>
          <p className="body" style={{ color: "var(--color-ink-dim)" }}>
            Most of the gain was the loop. Some of it was the bytecode.
            None of it was rethinking the design.
          </p>
        </ProseSection>
      ),
    },
    {
      id: "ceiling-3-epoll",
      node: (
        <ProseSection
          number="03"
          heading="C epoll"
          lede="Hand-written hashtable. Edge-triggered epoll, drain to EAGAIN. No allocator surprises."
        >
          <p className="body">
            The server is about four hundred lines of C. The hash table
            uses{" "}
            <Glossary
              term="FNV-1a"
              code={FNV1A_C}
              explanation="A fast non-cryptographic hash, around 1ns per byte on modern CPUs, no library dependency. Great fit for a server where keys are short and you control both ends of the wire."
            />{" "}
            with open addressing and linear probing, with tombstones to
            mark deleted slots. Each connection has its own read and
            write buffers. The epoll loop runs in edge-triggered mode
            and drains every socket until the kernel returns EAGAIN. The
            listening socket has TCP_NODELAY set so the kernel does not
            hold packets waiting for more payload.
          </p>
          <p className="body">
            Result: <CountUp value={36234} suffix="ops/sec" />.
          </p>
          <p className="body" style={{ color: "var(--color-ink-dim)" }}>
            From here on, tightening server code does almost nothing. The
            bottleneck has moved off-chip. Drag the RTT slider in the
            panel. It starts at the lab&apos;s eighty microseconds and the
            throughput number is computed from real CPU cost measured in
            a WASM build of the same hashtable, plus whatever RTT you dial
            in. Watch what dominates as you change just the network.
          </p>
        </ProseSection>
      ),
    },
    {
      id: "ceiling-4-iouring",
      node: (
        <ProseSection
          number="04"
          heading="io_uring"
          lede="The fancy thing that gave nothing."
        >
          <p className="body">
            Same hashtable, same protocol. Replace epoll with io_uring. Try
            SQPOLL. Try larger ring sizes. The number does not move.
          </p>
          <p className="body">
            Why: the workload is synchronous per op, in-flight depth is
            around three, there is no batching to amortize. io_uring&apos;s
            whole pitch is amortizing syscall cost across many in-flight
            ops. We don&apos;t have many in-flight ops.
          </p>
          <p className="body" style={{ color: "var(--color-ink-dim)" }}>
            Knowing when not to use the fancy thing is the lesson. The
            bottleneck moved off-chip two ceilings ago. The CPU has
            nothing left to give.
          </p>
        </ProseSection>
      ),
    },
    {
      id: "redis-comparison",
      node: (
        <ProseSection
          number="05"
          heading="The comparison: Redis 6.0"
          lede="Same lab, same wire, same workload shape. Different protocol, different server."
        >
          <p className="body">
            Three Redis instances run on the same host with persistence
            turned off. The benchmark uses the native redis-benchmark
            client so Python overhead is removed from both sides of the
            comparison. Value sizes range from 8 B to 1 KB.
          </p>
          <p className="body">
            L33T KV wins at every size in the sweep. At 8 B the lead is 1.6
            percent. At 1 KB it shrinks to 0.7 percent. Run-to-run variance
            is on the order of half a percent, so the smaller leads are
            effectively ties.
          </p>
          <p className="body" style={{ color: "var(--color-ink-dim)" }}>
            Per-node on loopback, Redis is roughly twice as fast as L33T KV.
            That gap is what fifteen years of allocator and string work
            buys. On the LAN, the network absorbs it.
          </p>
        </ProseSection>
      ),
    },
  ];

  // Renderer functions: receive scroll progress + active state per section.
  // Terminals use progress to drive their typing; chart/slider use active to
  // drive the border glow.
  const artifacts: Record<SectionId, (p: ArtifactProps) => React.ReactNode> = {
    "setup": (p) => <InteractiveSetup active={p.active} />,
    "ceiling-1-python": (p) => <ReplayTerminal lines={PYTHON_LINES} progress={p.progress} active={p.active} />,
    "ceiling-2-uvloop": (p) => <ReplayTerminal lines={UVLOOP_LINES} progress={p.progress} active={p.active} />,
    "ceiling-3-epoll": (p) => <WasmRttSlider active={p.active} />,
    "redis-comparison": (p) => <ValueSweepChart active={p.active} />,
    "ceiling-4-iouring": (p) => <IoUringNullResult progress={p.progress} active={p.active} />,
  };

  return (
    <main className="relative min-h-screen">
      <BackgroundLines />
      <div className="grain" aria-hidden />
      <ReadingProgress />

      <div className="relative" style={{ zIndex: 2 }}>
        <Hero />

        <div className="max-w-[1280px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="rule my-20 sm:my-28 lg:my-32" />
        </div>

        <DualColumn sections={sections} artifacts={artifacts} />

        <div className="max-w-[1280px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="rule my-20 sm:my-28 lg:my-32" />
        </div>

        <section className="max-w-[940px] mx-auto px-6 sm:px-12 lg:px-16 mb-28 sm:mb-40">
          <RevealOnScroll>
            <h2
              className="display-2 mb-8"
              style={{ textWrap: "balance" }}
            >
              Ranked 1/40 grad students.
            </h2>
            <p className="body mb-6 max-w-[760px]">
              The store was the final project in a graduate Cloud
              Computing class, run as a KV store design competition.
              Forty grad students in twelve teams, one benchmark on the
              same lab. L33T KV finished first at 36,200 ops per second:
              thirty-four percent ahead of second place, and roughly
              four times the median team.
            </p>
            <p className="body mb-10 max-w-[760px]" style={{ color: "var(--color-ink-dim)" }}>
              Second place ran at 27,000. Third at 15,000. Below that the
              field drops into the low thousands, mostly stores that
              never got the network out of the way.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={0.05}>
            <div className="border border-[var(--color-rule)] bg-[var(--color-midnight-2)] p-4 sm:p-6 scanlines">
              <pre className="mono-body leading-relaxed whitespace-pre-wrap">
                <span style={{ color: "var(--color-ink-muted)" }}>root@l33t:~$ </span>
                <span>cat leaderboard.txt</span>
                {"\n\n"}
                <span style={{ color: "var(--color-ink-dim)" }}>rank         </span>
                <span style={{ color: "var(--color-cyan)" }}>1/40 grad students</span>
                {"\n"}
                <span style={{ color: "var(--color-ink-dim)" }}>throughput   36,200 ops/sec</span>
                {"\n"}
                <span style={{ color: "var(--color-ink-dim)" }}>avg latency  0.08 ms</span>
                {"\n"}
                <span style={{ color: "var(--color-ink-dim)" }}>lead on 2nd  +34%</span>
              </pre>
            </div>
          </RevealOnScroll>
        </section>

        <div className="max-w-[1280px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="rule my-20 sm:my-28 lg:my-32" />
        </div>

        <section className="max-w-[940px] mx-auto px-6 sm:px-12 lg:px-16 mb-28 sm:mb-40">
          <h2
            className="display-2 mb-8"
            style={{ textWrap: "balance" }}
          >
            We beat Redis... But at what cost?
          </h2>
          <p className="body mb-6 max-w-[760px]">
            36,234 ops/sec to Redis 6.0&apos;s 35,670. A 1.6 percent edge
            that vanishes the moment you ask L33T KV to do anything Redis
            was actually built to do. Here is what got cut to claim those
            numbers.
          </p>

          <h3 className="h2 mt-14 mb-4">What you give up to get the speed.</h3>

          <InteractiveTradeoffs />

          <RevealOnScroll>
            <h3 className="h2 mt-16 mb-6">What this taught me.</h3>
          </RevealOnScroll>

          <div className="space-y-2">
            <RevealOnScroll>
              <Lesson headline="The wire protocol matters less than you would think.">
                RESP costs five to seven times the framing per op that our
                three-byte format does. At the LAN-RTT ceiling that
                difference disappears. The win you can measure isn&apos;t
                always the win that matters.
              </Lesson>
            </RevealOnScroll>
            <RevealOnScroll delay={0.05}>
              <Lesson headline="CPU is rarely the bottleneck once a real network is in the loop.">
                Three rewrites moved the server from thirteen thousand ops
                per second to thirty-six thousand. At five microsec of CPU
                per op against eighty microsec of LAN RTT, anything you do
                to the CPU side is shaving margins on a number that&apos;s
                already small.
              </Lesson>
            </RevealOnScroll>
            <RevealOnScroll delay={0.1}>
              <Lesson headline="Knowing when to stop optimizing is harder than starting.">
                io_uring gave nothing because there were no in-flight ops
                to amortize. The correct response to a fancy tool that
                doesn&apos;t help is to put it down, not to keep tuning
                parameters until something moves.
              </Lesson>
            </RevealOnScroll>
            <RevealOnScroll delay={0.15}>
              <Lesson headline="Fifteen years of operational hardening beats one weekend of micro-optimization.">
                Features you don&apos;t have are only valuable if you
                don&apos;t need them. The day L33T KV needs to survive a
                process restart is the day it stops being a benchmark and
                starts being a database, and that is a different project.
              </Lesson>
            </RevealOnScroll>
          </div>
        </section>

        <section className="max-w-[1040px] mx-auto px-6 sm:px-12 lg:px-16 pb-20 sm:pb-28 text-center">
          <p
            className="display-2"
            style={{ color: "var(--color-ink)", textWrap: "balance" }}
          >
            L33T KV.
            <br />
            A KV store that beats Redis 6.0
            {" "}
            <span style={{ color: "var(--color-ink-dim)" }}>
             by sacrificing everything Redis spent fifteen years building.
            </span>
          </p>
        </section>

        <footer className="max-w-[1040px] mx-auto px-6 sm:px-12 lg:px-16 pb-20 sm:pb-32 text-center">
          <div
            className="rule mx-auto mb-10"
            style={{ maxWidth: "120px" }}
          />
          <p
            className="small mono"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Made by{" "}
            <a
              href="https://github.com/AureliusNguyen"
              target="_blank"
              rel="noreferrer noopener"
              className="border-b border-transparent hover:border-[color:var(--color-cyan)]/60 hover:text-[color:var(--color-cyan)] transition-colors"
            >
              Leo
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/jhu04"
              target="_blank"
              rel="noreferrer noopener"
              className="border-b border-transparent hover:border-[color:var(--color-cyan)]/60 hover:text-[color:var(--color-cyan)] transition-colors"
            >
              Jeffrey
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

