# 0017. Live sync over Server-Sent Events

- Status: Proposed
- Date: 2026-10-09

## Context

[ADR-0006](0006-campaign-event-log-and-live-sync.md) records live play as an append-only `campaign_events` table
with a per-campaign sequence, and pushes new events to clients over a WebSocket per open campaign, fanned out by
Postgres `LISTEN/NOTIFY` with one listener per API instance. [ADR-0015](0015-production-host.md) then put the API
on AWS Lambda behind a Lambda Function URL in response-streaming mode, fronted by a Cloudflare Worker. That host
has no long-lived process and no background work between invocations, so it left the transport to this spike
(#175) and made streams request-scoped.

Traffic is one way: everything a client sends (rolls, damage, condition changes, turn changes, chat notes) is a
command that is already a plain `POST`, and only the server pushes. The question is how events reach clients.

| Criterion                    | Server-Sent Events                                                                                                                                                                                          | WebSockets                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting fit (#112, ADR-0015) | A streamed `GET` through the Function URL, as any other response. Billed like one, for as long as it is open.                                                                                               | **Not possible on Function URLs.** Lambda takes WebSockets only through API Gateway WebSocket APIs: a second endpoint, per-message and per-connection-minute pricing, and a connection-id model, not our image. |
| Resume after reconnect       | Built in. Each event's `id:` is its sequence; the browser reconnects by itself and sends `Last-Event-ID`; the server replays the gap from `campaign_events`. `retry:` sets the reconnect delay.             | Our own protocol: a resume message carrying the last sequence, our own reconnect and backoff.                                                                                                                   |
| Cloudflare and proxies       | Proxied on every plan. The Worker streams the body through. Cloudflare closes a connection after ~100 s with no bytes, so the stream sends a comment heartbeat. Responses must not be cached or compressed. | Proxied on every plan, same ~100 s idle limit, so a ping is needed too. The Worker must pass the `Upgrade` through, and the origin cannot accept it anyway (above).                                             |
| HTTP/2 and connection limits | Cloudflare speaks HTTP/2 and HTTP/3 to browsers, so streams are multiplexed and the six-per-origin HTTP/1.1 limit does not apply. One stream per open campaign.                                             | Usually one TCP connection per socket, outside HTTP/2 multiplexing. No limit that matters at one socket per campaign.                                                                                           |
| Auth                         | Same-origin `EventSource` sends the session cookie, so the stream authenticates like any request through `RequestAuthenticator`. Session renewal rides on the stream's response headers.                    | The cookie is sent on the upgrade request only; a socket outlives the session unless the server checks again.                                                                                                   |
| Server (Elysia 1.4)          | `sse()` from a generator handler, typed through Eden.                                                                                                                                                       | Built in (`.ws()`), but irrelevant on Lambda.                                                                                                                                                                   |
| Client (Angular 22)          | Native `EventSource`, wrapped in an `Observable` service. No library.                                                                                                                                       | Native `WebSocket` plus our resume and reconnect logic, or a library.                                                                                                                                           |
| Testability                  | Plain HTTP: tests read the body stream with `fetch`, and the Worker's proxy tests already cover streamed responses.                                                                                         | A socket client in tests, plus the resume protocol to test.                                                                                                                                                     |

How the server fans events out to open streams:

| Fan-out                                          | How                                                                                                              | Scale-to-zero                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LISTEN/NOTIFY` per stream                       | Each stream `LISTEN`s on its campaign's channel; the command's transaction issues `NOTIFY`, delivered on commit. | Each open stream is one Postgres connection and keeps Neon awake. No queries while nothing happens. One Lambda environment per stream, since Lambda runs one invocation at a time per environment. |
| Polling the event table                          | Each stream queries `seq > last` every second or so.                                                             | Same connections and the same wakefulness, plus constant queries against Neon's 5 GB egress and its CU-hours, and up to a second of latency.                                                       |
| External fan-out (a Durable Object per campaign) | Commands post the event to the campaign's Durable Object, which pushes to every client connected to it.          | Lambda holds no streams at all, and Neon sleeps between commands. Durable Objects are on Workers Free, but only WebSockets hibernate: an idle SSE stream would bill duration.                      |

## Decision

- **Live sync uses Server-Sent Events.** A client opens one `EventSource` per open campaign on a `GET` stream
  endpoint. Commands stay plain `POST`s. This supersedes the transport in ADR-0006; the event log, the sequence,
  server-side dice and `LISTEN/NOTIFY` stand.
- **Each event's SSE `id` is its sequence.** On connect the server reads `Last-Event-ID` (or, when there is
  none, a `since` query parameter for the first connection), replays every later event from `campaign_events`,
  then streams new ones. Clients still drop duplicates by sequence, as ADR-0006 requires.
- **Events commit in sequence order.** A command takes its sequence by incrementing a counter on the campaign row,
  and that row lock is held until commit, so commands in one campaign commit one at a time. Without this, event 6
  could commit and be sent before event 5, and a client resuming from 6 would never see 5.
- **Fan-out is `LISTEN/NOTIFY` per stream**, through Bun.SQL's `listen`. Each campaign has its own channel, named
  from its validated id, and the `NOTIFY` payload carries only the sequence (well under Postgres's 8000-byte
  limit); the stream reads the rows. The stream subscribes **before** it replays the gap, so no event can fall
  between the two, and drops anything it has already sent. If the listening connection drops, the stream ends and
  the client resumes, rather than the server trying to re-query what it missed.
- **Streams end after 5 minutes.** The server closes the stream; the browser reconnects with `Last-Event-ID` and
  resumes. This bounds what a stream costs after its client has gone (ADR-0015), and makes every stream
  re-authenticate within 5 minutes, so a revoked session or a removed member stops receiving events. The Lambda
  timeout drops from 900 s to 360 s: the stream cap plus a minute of margin.
- **A comment heartbeat every 25 seconds**, well inside Cloudflare's ~100 s idle limit. Stream responses carry
  `Cache-Control: no-store, no-transform`, so neither the edge Worker's cache nor Cloudflare's compression holds
  them back.
- **Auth is the session cookie** through `RequestAuthenticator`, checked when the stream opens. A member who is not
  allowed the campaign gets a `403` and no stream. Because `EventSource` gives up for good on an error status, the
  client service surfaces that state instead of retrying.
- **The client sees a transport-neutral port**: an Angular service that emits campaign events in sequence order
  and exposes the connection state. Nothing above it knows the transport.

## Consequences

- One endpoint, no new infrastructure, and the same image still runs under compose: on a VPS the stream is a
  long-lived response, and the per-stream `LISTEN` shares Bun.SQL's one listening connection per process.
- On Lambda, every open stream is one concurrent execution, one Postgres connection and continuous billed
  duration. ADR-0015's session estimate (~144k of the free 400k GB-s a month) already counts this. Two limits to
  watch:
  - The account's Lambda concurrency quota. New accounts can start well below the usual 1,000, and each viewer of
    a campaign holds one execution. Check it in the Service Quotas console before production (#116).
  - Neon stays awake while any stream is open, which spends its 100 CU-hours.
- A reconnect every 5 minutes per client costs one Lambda request and one replay query, usually empty.
- **Next step if this outgrows the free tiers:** a Durable Object per campaign as the fan-out. Since only
  WebSockets hibernate there, that move would switch the browser leg to WebSockets with hibernation while Lambda
  only posts events to the Object. The client port above keeps that change inside one service; the event log,
  sequences and resume rule carry over unchanged. That would be a new ADR superseding this transport decision.
- Writes and reads take different paths, so a client may see its own command's event on the stream before or
  after the `POST` returns. Clients apply events by sequence, never optimistically by response.
- Tests: the stream endpoint is a `*.db.test.ts` that opens the stream, issues commands and asserts the replayed
  and streamed sequences, including resume with `Last-Event-ID`, the cap and the heartbeat.
