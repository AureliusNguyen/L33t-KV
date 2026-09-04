# L33T KV

**A custom binary-protocol KV store, written from scratch in ~400 lines of C,
that ties Redis 6.0 on a lab LAN at 36,234 ops/sec.**

Live: [l33t-kv.vercel.app](https://l33t-kv.vercel.app)

This repo is the showcase site that walks through the project. The server
source and benchmarks live in a separate repo.

## What I built

A key-value store with two verbs (`SET` and `GET`), a hand-written
hashtable (FNV-1a + open addressing + linear probing), and a binary wire
protocol that costs 3 bytes of framing per op instead of Redis RESP's
17-23. Single epoll loop, edge-triggered, drain to `EAGAIN`. No threads,
no locks, no allocator surprises.

## Why it's important

I wanted to know how close a single weekend of careful C could get to
Redis. The honest answer turned out to be more interesting than the
benchmark:

- **Beat Redis 6.0 by 1.6 percent** on a 3-node LAN benchmark (36,234 vs
  35,670 ops/sec, value sizes 8 B - 4 KB).
- **Ranked 1/40 grad students in the class KV store competition.**
  Same benchmark on the same lab: 36,200 ops/sec, 34 percent ahead of
  second place. The leaderboard is on the site.
- **Then learned that the network was the actual bottleneck the whole
  time.** At 80 microsec of LAN RTT against 5 microsec of CPU per op,
  most of my "optimizations" were rearranging margins on a number
  decided off-chip.
- **io_uring gave zero improvement.** Swapped epoll for io_uring,
  measured, swapped back. The workload has 3 in-flight ops per client -
  no batching to amortize. Knowing when to stop tuning is harder than
  starting.
- **Per-node, Redis is still ~2x faster on loopback.** The LAN absorbs
  that gap. L33T won the visible race because the network refereed the
  whole thing.

## The journey

| Iteration | Result | What changed |
|---|---|---|
| Python asyncio | 13,420 ops/sec | baseline, dict-backed, no event-loop tricks |
| uvloop + tightened bytecode | 31,200 ops/sec | swap libuv, cache `struct.Struct`, `LOAD_FAST` hot path |
| C epoll | **36,234 ops/sec** | hand-written hashtable, edge-triggered, `TCP_NODELAY` |
| C io_uring | 36,189 ops/sec | the fancy tool that gave nothing |

Three rewrites to discover the wall was off-chip.

## What I sacrificed for those numbers

L33T does one thing. Redis does fifteen years of operational hardening.
The site has an interactive checklist that lets you toggle features you'd
need in production and see whether L33T works or whether you should reach
for Redis - but the short list of what got cut:

- No persistence (RAM only, kill the process and lose everything)
- No replication, no failover
- No eviction under memory pressure
- No auth, no TLS
- No observability - no logs, no metrics, no slowlog
- No data types beyond bytes - hashes, lists, sets, streams are all
  Redis-only
- No TTL, no pub/sub, no Lua, no transactions, no cluster mode

The 1.6 percent win is real. It's also the entire surface area.

## What this taught me

- **The wire protocol matters less than I expected.** RESP costs 5-7x
  more framing per op than my 3-byte format. At the LAN ceiling, that
  difference disappears.
- **CPU is rarely the bottleneck once a real network is in the loop.**
  Three rewrites moved the server from 13k to 36k ops/sec; most of those
  gains were unrecognizable next to the 80 microsec RTT.
- **Knowing when to stop optimizing is a skill.** I put down io_uring
  after one benchmark instead of tuning ring sizes for two days.
- **Operational hardening beats micro-optimization.** The day L33T KV
  needs to survive a process restart, it stops being a benchmark and
  starts being a database. That's a different project.

## The showcase site

The hosted page at [l33t-kv.vercel.app](https://l33t-kv.vercel.app) is a
single-page longform piece. It includes:

- An **interactive command runner** powered by a WASM build of the same
  hashtable and parser the C server uses. Type `SET key_1 hello`, hit
  Run, see the actual wire bytes broken apart with labels.
- A **scroll-driven terminal** for each iteration - the typing reveals
  as you scroll, with a play button to fast-forward.
- An **RTT slider** that takes real WASM-measured CPU cost and lets you
  dial in the network latency. Watch what dominates as you slide from
  loopback to WAN.
- A **value-size sweep chart** comparing L33T KV and Redis at 8B / 100B
  / 1KB / 4KB.
- An **interactive trade-off quiz** for the "could I actually use this"
  conversation.

## Stack

Next.js 16, Tailwind v4, Motion. Emscripten for the WASM core, deployed to Vercel as a static site with zero backend.

## Running it locally

```sh
nvm use 20
npm install
npm run dev   # http://localhost:3000
```

To rebuild the WASM core after editing `wasm-src/l33t-core.c`:

```sh
source $HOME/emsdk/emsdk_env.sh
make -C wasm-src OUT_DIR=../lib/wasm
git add lib/wasm/l33t-core.js
```

Vercel never runs emscripten - the built WASM ships as a committed
artifact.

## Deploy

Pushes to `main` deploy automatically via Vercel's GitHub integration.
Production alias is `l33t-kv.vercel.app`.

## A note on the benchmark

Three Redis instances vs three L33T KV instances, same lab host, same
`redis-benchmark` client to remove Python overhead from both sides,
persistence off, 100k ops per shard. The values 36,234 vs 35,670 are
medians of three runs; run-to-run variance is larger than the gap.
Reproducing instructions and raw numbers live in the source repo.
