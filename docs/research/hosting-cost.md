# Rust service hosting cost: Cloudflare Containers or Railway

Research for issue #2. All sources are first-party pricing and docs pages fetched on 2026-10-05. Prices are USD. A month is taken as 730 hours (2,628,000 seconds).

## Answer

**Railway Hobby: a flat $5.00/month.** The $5 subscription includes $5 of usage, and a small Rust process uses well under $1 of it, so the bill is the subscription and nothing more. It is always-on by default, needs no glue code, and WebSockets stay open indefinitely.

**Cloudflare Containers: about $6.75/month** for one always-on `lite` instance ($5 Workers Paid plus about $1.74 of memory and disk overage), rising to about $9.57 if the CPU were pegged all month. If the Workers Paid plan is already being bought for another reason, the marginal cost is only $1.74 to $4.57. It is not always-on by design: staying awake with no viewers needs a Worker, a Durable Object and a keep-alive loop written by us.

Recommendation: **Railway** of the two. It matches the $5 bar and fits a single long-lived process with in-memory state without workarounds. Choose Cloudflare Containers only if Workers Paid is being paid for anyway and the keep-alive glue is acceptable.

Worth knowing, although outside the ticket's two options: the same always-on process on Fly.io is listed at $2.19/month (shared-cpu-1x, 256 MB), so neither option is cheaper than staying on Fly.

## Workload assumed

One process, always running. Rust with in-memory actors: assumed roughly 50 MB resident memory and about 1% of one vCPU on average (polling every few seconds during games, near idle otherwise), a handful of open streams, negligible egress (well under 1 GB/month). These usage figures are assumptions, not measurements; the sensitivity rows below show how far they can be wrong before the conclusion changes.

## Railway

### Pricing model

- Hobby plan is $5/month and "includes $5 of resource usage per month". The subscription is a floor: "If your resource usage is $3, your total bill for the cycle will be $5". Included usage "is reset at the end of every billing cycle and does not accumulate over time". [plans]
- Usage is metered on actual consumption, not on a provisioned size: "Pay only for what your app uses, by the second. No overprovisioning, no idle markup." [railway-pricing] "You are only charged for the resources you actually use". [plans]
- Rates: RAM $10/GB/month, CPU $20/vCPU/month, volume $0.15/GB/month, egress $0.05/GB. [plans]
- Hobby per-service limits: 48 vCPU, 48 GB RAM, 5 GB volume, 6 replicas. [plans]
- A Free plan exists with $1 of credit per month, limited to 0.5 GB RAM and 1 vCPU per service. [plans] [railway-pricing]

### Cost

| Scenario | RAM | CPU | Usage | Monthly bill |
|---|---|---|---|---|
| Assumed (50 MB, 0.01 vCPU) | $0.50 | $0.20 | $0.70 | **$5.00** |
| Heavier (128 MB, 0.05 vCPU) | $1.28 | $1.00 | $2.28 | $5.00 |
| Much heavier (256 MB, 0.10 vCPU) | $2.56 | $2.00 | $4.56 | $5.00 |
| Break-even exceeded (512 MB, 0.10 vCPU) | $5.12 | $2.00 | $7.12 | $7.12 |

The bill stays at $5 until usage is roughly seven times the assumption. On paper the assumed $0.70 would also fit the Free plan's $1 credit, but that leaves almost no margin and I did not verify the Free plan's other restrictions, so it is not the basis of the recommendation.

### Sleep and staying awake

- Services are always-on unless the Serverless option is enabled for the service. [sleeping]
- With Serverless enabled, sleep is driven by outbound traffic: "Railway automatically detects inactivity based on outbound traffic"; "Once a service stops sending packets it is considered inactive after 5 minutes" and in practice it sleeps "between 5 and 10 minutes after its last outbound traffic". Outbound packets include "network requests, database connections, or even NTP". [sleeping]
- Consequence: a process that polls the NHL API every few seconds never sleeps even with Serverless on. With Serverless off (the default) it runs regardless. Either way it can poll with no viewers. Leave Serverless off, because a sleep would discard the in-memory actor state.

### Long-lived connections

- "Websocket connections are exempt from these duration and inactivity limits, and can stay open indefinitely, even while idle." [limits]
- "HTTP requests can run for up to 15 minutes if data keeps transferring (for example, keep-alive heartbeats), and are otherwise closed after 5 minutes with no data transferred." [limits] The page does not mention SSE by name; an SSE stream is an HTTP request, so read this as: SSE needs a heartbeat and will be cut and must reconnect every 15 minutes. That reading is my inference.
- 10,000 concurrent connections per domain. [limits]

### Cold start

Only relevant with Serverless on. Not quantified: "It may take a small amount of time for the service to spin up again on the first request", and "The first request sent to a slept service may return a 502 Bad Gateway response." [sleeping]

## Cloudflare Containers

### Pricing model

- Requires the Workers Paid plan at $5/month; the Free plan has no container support. [cf-pricing]
- Memory and disk are billed on the provisioned instance size for as long as the instance is awake; CPU is billed on active usage only. [cf-pricing]
- Included per month, then overage: memory 25 GiB-hours then $0.0000025/GiB-second; CPU 375 vCPU-minutes then $0.000020/vCPU-second; disk 200 GB-hours then $0.00000007/GB-second. [cf-pricing]
- Smallest instance types: `lite` 1/16 vCPU, 256 MiB, 2 GB disk; `basic` 1/4 vCPU, 1 GiB, 4 GB disk. [cf-pricing]
- Egress: $0.025/GB in North America and Europe with 1 TB/month included. [cf-pricing]
- "each container has its own Durable Object. You are billed for your usage of both Workers and Durable Objects." [cf-pricing] Durable Objects include 400,000 GB-s of duration per month and are billed at a fixed 128 MB. [do-pricing]
- "Charges start when a request is sent to the container or when it is manually started. Charges stop after the container instance goes to sleep." [cf-pricing]

### Cost of one instance awake all month

`lite`:

| Item | Usage | Included | Overage | Cost |
|---|---|---|---|---|
| Memory | 0.25 GiB x 730 h = 182.5 GiB-h | 25 | 157.5 GiB-h | $1.42 |
| Disk | 2 GB x 730 h = 1,460 GB-h | 200 | 1,260 GB-h | $0.32 |
| CPU at about 5% of the 1/16 vCPU | about 8,200 vCPU-s | 22,500 | none | $0.00 |
| CPU if pegged at 100% all month | 164,250 vCPU-s | 22,500 | 141,750 vCPU-s | $2.84 |
| Durable Object duration, worst case (in memory all month) | 0.128 GB x 2,628,000 s = 336,384 GB-s | 400,000 | none | $0.00 |

- Usage total: **$1.74** (light CPU) to **$4.57** (CPU pegged).
- With the $5 plan: **$6.74 to $9.57 per month**.
- `basic`, if 256 MiB or 1/16 vCPU proves too small: memory $6.35 + disk $0.69 = $7.03 before CPU, so about **$12/month** with the plan.

### Sleep and staying awake

- Sleeping is the default: `sleepAfter` defaults to `"10m"`, "how long to keep the container alive without activity before shutting it down". [container-class]
- Only incoming requests count automatically: "Incoming requests reset the timer automatically. Call this manually from background work, such as a scheduled task or a long-running operation, that should count as activity and prevent the container from sleeping." [container-class] The container's own outbound polling does not keep it awake.
- Ways to stay awake, both ours to write: call `renewActivityTimeout()` on a schedule, or override the expiry hook ("If you override `onActivityExpired()`, call `await this.stop()` or `await this.destroy()`. Otherwise, the container does not go to sleep."). [container-class]
- There is no fixed maximum lifetime: "Cloudflare does not stop a container instance after a fixed maximum runtime." [cf-faq]
- Starting with no viewer is possible: the docs' cron example starts a container from a Worker Cron Trigger through its Durable Object. [cf-cron]
- Instances are still stopped for platform reasons, including host moves: SIGTERM, up to 15 minutes to exit, then SIGKILL. [cf-lifecycle] Something has to start it again, and in-memory state is gone.
- Disk is ephemeral: "When a Container instance goes to sleep, the next time it starts, it uses a fresh disk from the container image." [cf-lifecycle]

So always-on is achievable but against the grain: the docs offer no "never sleep" switch, and the instance must be woken and kept awake by a Worker and Durable Object that would not otherwise exist.

### Long-lived connections

- Traffic reaches the container through a Worker and the Durable Object. WebSockets are proxied by the Container class's `fetch()` (not by `containerFetch()`). [container-class]
- Workers: "There is no hard limit on duration for HTTP-triggered Workers. As long as the client remains connected, the Worker can continue processing." [workers-limits]
- The Containers limits page lists no connection count or stream timeout. [cf-limits] I found no documented cap, which is not the same as a documented guarantee.

### Cold start

"Container cold starts can often be in the 1-3 second range, but this is dependent on image size and code execution time". [cf-lifecycle]

## Side by side

| | Railway Hobby | Cloudflare Containers (`lite`) |
|---|---|---|
| Monthly cost, this workload | $5.00 | $6.74 (up to $9.57) |
| Marginal cost if the plan is already paid for | n/a | $1.74 to $4.57 |
| Billing basis | Actual RAM and CPU used | Provisioned RAM and disk, active CPU |
| Always-on | Default | Not default; keep-alive code required |
| Awake with no viewers | Yes | Yes, with a cron trigger and timer renewal |
| WebSocket | Indefinite | Proxied through Worker and Durable Object; no documented limit |
| SSE | Cut at 15 minutes, needs heartbeat | No hard duration limit documented |
| Cold start | Not quantified; first request may 502 (Serverless only) | "1-3 second range" |
| Extra moving parts | None | Worker, Durable Object, wrangler config |

Fly.io reference, for the existing bar: shared-cpu-1x is $2.19/month at 256 MB and $3.69/month at 512 MB, with egress at $0.02/GB in North America and Europe. [fly-pricing]

## Not verified

- The workload's real memory and CPU; the figures are assumptions. The Railway conclusion holds up to about seven times the assumed usage. On Cloudflare, memory is billed at the instance size regardless, so only the CPU line moves.
- Whether the Durable Object is billed for duration for the whole time its container runs. The Containers pricing page does not say. The table uses the worst case, which still fits inside the included allowance, so the total does not depend on the answer.
- How often Cloudflare restarts container hosts. The docs describe the shutdown sequence but give no frequency.
- Railway cold-start time in seconds, and Railway's behaviour for SSE specifically (inferred from the general HTTP limit).
- The Railway Free plan's full restrictions.
- Nothing was deployed or measured; this is a reading of published prices and docs. Cloudflare's pricing page shows a last-updated date of 2026-08-28.

## Sources

- [plans] https://docs.railway.com/reference/pricing/plans
- [railway-pricing] https://railway.com/pricing
- [sleeping] https://docs.railway.com/reference/app-sleeping
- [limits] https://docs.railway.com/networking/public-networking/specs-and-limits
- [cf-pricing] https://developers.cloudflare.com/containers/pricing/
- [cf-limits] https://developers.cloudflare.com/containers/platform-details/limits/
- [cf-lifecycle] https://developers.cloudflare.com/containers/platform-details/architecture/
- [cf-faq] https://developers.cloudflare.com/containers/faq/
- [container-class] https://developers.cloudflare.com/containers/api/container-class/
- [cf-cron] https://developers.cloudflare.com/containers/examples/cron/
- [do-pricing] https://developers.cloudflare.com/durable-objects/platform/pricing/
- [workers-limits] https://developers.cloudflare.com/workers/platform/limits/
- [fly-pricing] https://docs.fly.io/about/pricing
