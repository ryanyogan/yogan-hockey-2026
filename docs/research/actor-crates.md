# Rust actor crates for per-game actors

Research for [issue #7](https://github.com/ryanyogan/yogan-hockey-2026/issues/7). All figures were read on 2026-10-05 from crates.io, GitHub and the crates' source.

## Answer

Shortlist **kameo** and **ractor** for the side-by-side prototype.

- **kameo** is the closest match to OTP supervisors: restart policies, one-for-one / one-for-all / rest-for-one strategies and restart limits are built in. Its supervision is new (April 2026) and has two open bugs that the prototype must exercise.
- **ractor** is the closest match to `gen_server` and Erlang's `registry` and `pg`, and its core has been stable for longer. It gives supervision events but no restart policy; you write the restart logic or add a third-party crate.
- **actix** is ruled out: its registry holds one actor per type, so it cannot look up an actor by game id, and it has had no release since June 2024.
- No other candidate is both maintained and widely used.

Neither shortlisted crate has reached 1.0, and each is written almost entirely by one person.

## What the service needs

Taken from the issue and from the OTP code being replaced (`application.ex`, `live_scores_server.ex` in the old repo):

| Need | OTP today |
|---|---|
| Three long-lived pollers that restart on crash | `Supervisor` with `:one_for_one` |
| Timed self-messages | `Process.send_after(self(), :poll, interval)` |
| One actor per live game, found by game id, started on first viewer | not built yet (would be `DynamicSupervisor` + `Registry`) |
| Fan-out of new events to viewers | `Phoenix.PubSub.broadcast` |
| Stop when the game ends or the last viewer leaves | not built yet |

## Comparison

| | ractor 0.16.5 | kameo 0.22.2 | actix 0.13.5 |
|---|---|---|---|
| Supervision | Link parent and child; parent receives `SupervisionEvent` (started, terminated, failed) | Built-in supervisor: `RestartPolicy`, `SupervisionStrategy`, `restart_limit` | `Supervisor` restarts an actor in place by calling `restarting()` |
| Restart policy | None built in; "left to the implementor" | Permanent / Transient / Never, with a restart limit per time window | Always restarts; no policy or limit |
| Lookup by game id | Global registry keyed by `String`; `registry::where_is(name)` | Global registry keyed by string; `ActorRef::lookup(name)` | No. Registry is keyed by actor type, one instance per type |
| Duplicate name on spawn | `SpawnErr::ActorAlreadyRegistered` | `RegistryError::NameAlreadyRegistered` | not applicable |
| Unregister on stop | Automatic | Automatic | not applicable |
| Broadcast | `pg` process groups; `OutputPort` pub/sub to actors | `kameo_actors`: `PubSub`, `Broker`, `MessageBus`, with five delivery strategies | `actix-broker` (separate crate) |
| Timers | `time::send_interval`, `send_after`, `exit_after` | `kameo_actors::scheduler` (`SetInterval`, `SetTimeout`); `attach_stream` | `run_interval`, `run_later` on the context |
| Mailbox | Unbounded | Bounded, default capacity 64; unbounded optional | Bounded |
| Runtime | tokio (default feature); async-std optional | tokio only | `actix-rt`, its own system on top of tokio |
| Handler shape | One `Msg` enum per actor; `async fn handle(&self, myself, msg, &mut state)` | One `impl Message<T>` per message type with a typed `Reply`; `async fn handle(&mut self, msg, ctx)` | `fn handle(&mut self, msg, ctx) -> Self::Result`; not an `async fn` |
| MSRV | 1.85 | 1.88 | 1.72 released; 1.88 on main |
| License | MIT | MIT or Apache-2.0 | MIT or Apache-2.0 |

### Maintenance health

| | ractor | kameo | actix |
|---|---|---|---|
| Latest release | 0.16.5, 2026-08-07 | 0.22.2, 2026-07-18 | 0.13.5, 2024-06-09 |
| Releases in the last 12 months | 11 (0.15.9 to 0.16.5) | 9 (0.19.0 to 0.22.2) | 0 |
| First release | 2023-01-07 | 2024-03-29 | 2017-09-25 |
| Downloads, all time | 1.25 M | 0.93 M | 19.5 M |
| Downloads, last 90 days | 385 k | 526 k | 1.89 M |
| Downloads Aug / Sep 2026 | 107 k / 164 k | 182 k / 219 k | 610 k / 689 k |
| Reverse dependencies on crates.io | 38 | 26 | 329 |
| GitHub stars | 2,116 | 1,397 | 9,251 |
| Open issues / open PRs | 7 / 12 | 10 / 12 | 32 / 3 |
| Closed issues | 102 | 84 | 230 |
| Last commit on main | 2026-08-17 | 2026-09-13 | 2026-10-01 (dependency bumps) |
| Contributors; top author's commits | 35; slawlor 202 | 31; tqwewe 390 | 100; fafhrd91 611 |

Both ractor and kameo are growing month over month. Kameo passed ractor on recent downloads despite being a year younger.

## ractor

Repository: <https://github.com/slawlor/ractor>. Docs: <https://docs.rs/ractor/0.16.5/ractor/>.

- **Model.** The crate describes itself as "inspired from Erlang's `gen_server`". An actor has `pre_start`, `post_start`, `handle`, `handle_supervisor_evt` and `post_stop`. State is a separate associated type built in `pre_start`.
- **Supervision.** `Actor::spawn_linked` links a child to a supervisor. The supervisor gets `ActorStarted`, `ActorTerminated` (with last state and exit reason) or `ActorFailed` in `handle_supervisor_evt`. The crate docs say: "Supervision is presently left to the implementor to outline handling of supervision events." Panics are caught unless the binary is built with `panic = "abort"`. A panic in `pre_start` fails the spawn instead of notifying the supervisor.
- **Restart add-on.** [`ractor-supervisor`](https://crates.io/crates/ractor-supervisor) 0.2.0 (third party, updated 2026-08-02, 10.8 k downloads) adds OTP-style supervisors. I did not read its source.
- **Registry.** Passing `Some(name)` to `spawn` registers the actor. `registry::where_is(name)` returns an `ActorCell` that converts to a typed `ActorRef`. Names are freed when the actor stops. A game actor would be named something like `game:2026020123`.
- **Broadcast.** `pg::join(group, actors)` and `pg::get_members(group)` mirror Erlang `pg`. `OutputPort<T>` is a pub/sub port whose subscribers are actors. The default `OutputPort` sits on a tokio broadcast channel with a 10-message buffer and can drop messages for a slow subscriber; the `output-port-v2` feature replaces it with a fan-out task that delivers every message. Issue [#225](https://github.com/slawlor/ractor/issues/225) (open since 2024-03) tracks the lag behaviour.
- **Timers.** `time::send_interval(period, cell, msg_fn)` covers the poll loop. `time::exit_after` could cover an idle timeout.
- **Extras.** `factory` is a worker-pool module. The companion crate [`ractor_actors`](https://crates.io/crates/ractor_actors) 0.7.0 (2026-07-29) has a watchdog, cron, stream and broadcast helpers.
- **Health.** The README says ractor is the basis of Meta's Rust Thrift overload protection, presented at RustConf 2024. 0.16.0 (2026-07-29) raised the MSRV from 1.64 to 1.85 and was followed by five patch releases in ten days. Clustering lives in `ractor_cluster`, which the README says "shouldn't be considered production ready"; this service does not need it.
- **Open issue to watch.** [#398](https://github.com/slawlor/ractor/issues/398), "Enable explicit graceful-stop of child Actors" (2025-10).

## kameo

Repository: <https://github.com/tqwewe/kameo>. Docs: <https://docs.rs/kameo/0.22.2/kameo/>.

- **Model.** The actor is a plain struct. `#[derive(Actor)]` covers the default case. Each message is its own type with `impl Message<T> for MyActor` and a typed `Reply`. Callers use `actor_ref.tell(msg)` or `actor_ref.ask(msg)`. Hooks: `on_start`, `on_message`, `on_panic`, `on_link_died`, `on_stop`.
- **Supervision.** `Worker::supervise(&parent_ref, args).restart_policy(..).restart_limit(n, window).spawn()`. Policies are `Permanent`, `Transient`, `Never`. Strategies are `OneForOne`, `OneForAll`, `RestForOne`. A game actor that should end with the game maps onto `Transient` or `Never`; the three pollers map onto `Permanent`. Actors can also be linked as siblings with `link`.
- **Supervision is new.** It was added in 0.20.0 (2026-04-07) as a breaking change. Two bugs filed in August 2026 are open: [#392](https://github.com/tqwewe/kameo/issues/392) "ActorRef lifecycle controls become stale after a supervised restart" and [#393](https://github.com/tqwewe/kameo/issues/393) "Terminal supervised children remain retained by their supervisor". #393 matters here, because game actors are short-lived children that end for good. A related fix, "serialize supervised restarts" (#387), is on main but not in a release.
- **Registry.** `actor_ref.register(name)` and `ActorRef::<A>::lookup(name)`. The local registry is a global map behind a mutex. The entry is removed when the actor stops. With the `remote` feature these same calls become async and use a libp2p swarm; leave that feature off.
- **Broadcast.** [`kameo_actors`](https://crates.io/crates/kameo_actors) 0.8.1 has `PubSub<M>` (with filters), `Broker` (topic patterns) and `MessageBus` (by message type). Delivery is one of `Guaranteed`, `BestEffort`, `TimedDelivery`, `Spawned`, `SpawnedWithTimeout`. Subscribers are actors. `PubSub` drops a subscriber once a send finds it stopped, but there is no explicit unsubscribe: [#269](https://github.com/tqwewe/kameo/issues/269), open since 2025-12.
- **Timers.** `kameo_actors::scheduler` offers `SetInterval` and `SetTimeout`. `attach_stream` feeds any `Stream` into the actor as messages.
- **Back-pressure.** Mailboxes are bounded at 64 by default, so `tell` awaits when the actor is behind.
- **Health.** Four minor releases in the last 12 months (0.19, 0.20, 0.21, 0.22); before 1.0 each may break the API, and 0.20 did. MSRV 1.88, edition 2024. The repo has a book, a terminal console for a running actor tree, and release automation.
- **Open issue to watch.** [#397](https://github.com/tqwewe/kameo/issues/397): `wait_for_shutdown` resolves before `on_stop` finishes.

## actix

Repository: <https://github.com/actix/actix>. Docs: <https://docs.rs/actix/0.13.5/actix/>.

Ruled out for three reasons:

1. **No lookup by key.** `Registry` stores `SystemService` and `ArbiterService` actors in a map keyed by `TypeId`. That gives one instance per actor type. A map from game id to `Addr` would be hand-written.
2. **No release in 16 months.** The last release was 0.13.5 on 2024-06-09. Recent commits are dependency and CI upkeep; the only unreleased changelog entry is an MSRV bump.
3. **Older handler model.** `Handler::handle` is a plain function, not an `async fn`. Async work goes through `ResponseFuture` or `ActorFuture` wrappers. Actors run on `actix-rt` arbiters, a second runtime layer beside the one axum uses.

Its download count is high because of its age and its 329 dependents, not because of new adoption. `actix-web-actors`, the old bridge to actix-web, is published as `4.3.1+deprecated`.

## Other candidates

| Crate | Latest release | Downloads, 90 days | Verdict |
|---|---|---|---|
| [acton-reactive](https://crates.io/crates/acton-reactive) | 10.0.0, 2026-09-30 | 3.6 k | Active, but one author, 12 stars, and ten major versions in two years |
| [elfo](https://crates.io/crates/elfo) | 0.2.0-alpha.21, 2026-03-27 | 0.6 k | Active repo; in alpha since 2023; built for large many-actor-group systems |
| [spawned-concurrency](https://crates.io/crates/spawned-concurrency) | 0.5.0, 2026-03-13 | 40 k | Erlang-style, from LambdaClass; young (2025-07). Not examined in depth |
| [rsactor](https://crates.io/crates/rsactor) | 0.17.0, 2026-06-15 | 2.2 k | Young (2025-05), small user base |
| [xtra](https://crates.io/crates/xtra) | 0.6.0, 2024-02-02 | 5.8 k | No commits since 2024-11 |
| [coerce](https://crates.io/crates/coerce) | 0.8.11, 2023-10-16 | 7.5 k | No commits since 2024-02 |
| [stakker](https://crates.io/crates/stakker) | 0.2.16, 2026-07-15 | 0.4 k | Single-threaded, not tokio-based |
| [tonari-actor](https://crates.io/crates/tonari-actor) | 0.12.1, 2026-02-03 | 0.3 k | Tiny user base |
| [zestors](https://crates.io/crates/zestors) | 0.3.1, 2026-09-30 | 0.07 k | Tiny user base |
| riker, bastion, xactor, act-zero | 2020 to 2022 | n/a | Abandoned |

`spawned-concurrency` is the only one here with real download volume. It is the one to look at if both shortlisted crates disappoint.

## Pairing with axum

This section is my reading of the crates' types, not something either project documents. I did not check axum's docs today.

- Both `ractor::ActorRef` and `kameo::actor::ActorRef` are cheap to clone and can be held in axum's `State`. Both run on the same tokio runtime as axum, with no second runtime to start. The three pollers and a top-level supervisor are spawned in `main` before `axum::serve`.
- An SSE or WebSocket connection is not an actor in either crate, and both crates' pub/sub delivers to actors. The simplest shape in both is for the game actor to own a `tokio::sync::broadcast::Sender`. The handler looks up or starts the game actor, asks it for a `Receiver`, and wraps that as the SSE stream.
- With that shape, "last viewer left" is `Sender::receiver_count() == 0`, checked on each poll tick. Neither crate provides viewer counting.
- "Start on first viewer" is: look up by name; if absent, spawn with that name; if the spawn reports the name is taken, look up again. Both crates return a distinct error for a taken name.
- actix would need its `System` started alongside axum's runtime, which is one more reason to drop it.

## What the prototype should settle

1. **Get-or-start under a race.** Two viewers arrive at once for the same game. Does exactly one actor end up running in each crate?
2. **Game actor ends for good.** In kameo, does a finished `Transient` or `Never` child leak in its supervisor (#393)? In ractor, how much code is the hand-written equivalent?
3. **Poller crash.** Panic inside a poll. Kameo should restart it from policy. In ractor, count the lines needed to do the same, or try `ractor-supervisor`.
4. **Registry after restart.** Is a restarted actor findable under the same name without extra code?
5. **Ergonomics.** One enum per actor (ractor) against one type per message (kameo), judged on the game actor's real message set.

## Limits of this research

- I read source at the head of each default branch: ractor one commit past 0.16.5, kameo five commits past 0.22.2. Feature claims were cross-checked against the changelog where a version is cited, but not line by line against the published tarballs.
- No code was compiled or run. Behaviour under races, restarts and load is unverified.
- `ractor-supervisor`, `spawned-concurrency`, `acton-reactive` and `rsactor` were assessed from crates.io metadata only.
- Download counts include CI and dependency resolution, so they overstate human adoption.
- The Meta usage claim is ractor's own README statement.

## Sources

- crates.io API: `https://crates.io/api/v1/crates/{name}`, `/downloads`, `/reverse_dependencies`
- GitHub API: repository, commits, contributors and issue search for each repo
- ractor source: `ractor/src/lib.rs`, `registry.rs`, `pg.rs`, `port/output.rs`, `time.rs`, `errors.rs`, `actor/messages.rs`, `actor/actor_properties.rs`, `README.md`, `docs/runtime-semantics.md`
- ractor_actors source: `ractor_actors/src/lib.rs`, `watchdog/mod.rs`
- kameo source: `src/supervision.rs`, `src/registry.rs`, `src/actor.rs`, `src/actor/actor_ref.rs`, `src/actor/spawn.rs`, `src/error.rs`, `actors/src/pubsub.rs`, `actors/src/lib.rs`, `actors/src/scheduler.rs`, `CHANGELOG.md`, `README.md`, `Cargo.toml`
- actix source: `actix/src/registry.rs`, `supervisor.rs`, `handler.rs`, `CHANGES.md`, `README.md`
