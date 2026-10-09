# 0014. Production on AWS Lambda and Neon free tiers, in Sydney

- Status: Proposed
- Date: 2026-10-09

## Context

Epic 10.2 needs a production host for the one image from [ADR-0012](0012-container-image.md). Most users are in
Oceania, so the host should be in Sydney or close to it. Traffic is low and mostly text. Live sync
([ADR-0006](0006-campaign-event-log-and-live-sync.md)) needs long-lived client connections and a Postgres session
that can `LISTEN` (no transaction-mode pooler). The goal is to pay nothing at low traffic without losing the
option to move.

Prices were checked on 2026-10-09 (USD unless noted; low traffic means one region, ~5 GB of data, ~50 GB of
egress a month):

| Option                                  | Region         | ~Monthly         | Long-lived conn + `LISTEN`   | Backups            | Ops    |
| --------------------------------------- | -------------- | ---------------- | ---------------------------- | ------------------ | ------ |
| Hetzner CAX11 + compose + Cloudflare    | EU only        | €7.70            | Yes                          | +20% (disk)        | High   |
| OVHcloud VPS-1 + compose + Cloudflare   | Sydney         | A$6.29 (from)    | Yes                          | Daily, included    | High   |
| Lightsail 2 GB + compose                | Sydney         | 12               | Yes                          | Snapshots $0.05/GB | High   |
| Fly.io app + self-run Postgres          | Sydney         | ~16              | Yes                          | Volume snapshots   | Medium |
| Railway Hobby                           | Singapore only | ~10              | Yes                          | Volume backups     | Low    |
| Cloud Run + Neon                        | Sydney         | ~65+             | Only pinned warm             | Neon PITR          | Low    |
| Vercel + Neon                           | Sydney         | 0 Hobby / 20 Pro | No: functions, not our image | Neon               | Low    |
| Oracle Always Free (Arm 2 OCPU / 12 GB) | Sydney         | 0                | Yes                          | Own                | High   |
| **AWS Lambda + Neon Free + Cloudflare** | Sydney         | **0**            | Per stream, see below        | Own `pg_dump`      | Medium |

Notes behind the table:

- Hetzner raised cloud prices on 2026-04-01 and 2026-06-15, its cheap tier has been intermittently sold out
  since September, and its cheap plans are EU only (~280 ms from New Zealand).
- Cloud Run only keeps WebSockets and `LISTEN` alive with a minimum instance and always-on CPU (~$44), and Neon
  must then never scale to zero (~$21).
- Vercel cannot run the compiled binary; the API would become functions. Hobby is non-commercial only.
- Oracle cut its Always Free Arm allowance without notice in June 2026 and reclaims instances that look idle.
- GCP's free VM is US-only and its free egress excludes Australia; Azure's free Postgres lasts 12 months.
- AWS keeps Lambda (1M requests and 400k GB-s a month) and 100 GB a month of internet egress free indefinitely.
  Neon Free has 100 CU-hours a month per project, 1 GB of storage, 5 GB of egress, scale-to-zero after 5 minutes
  (which cannot be turned off) and 6 hours of history, and runs in `aws-ap-southeast-2`. Past a limit its compute
  is suspended until the next month.
- Cloudflare's free plan cannot rewrite the `Host` header (Origin Rules allow that on Enterprise only), and a
  Function URL is addressed by its own AWS hostname, so a plain proxied DNS record is not enough.
- Lambda streams responses through Function URLs (up to 200 MB; 2 MBps after the first 6 MB). A stream is not
  stopped when the client disconnects: it runs, and is billed, until the function returns or times out.

## Decision

- **The API image runs on AWS Lambda in `ap-southeast-2`** (arm64), through the AWS Lambda Web Adapter: one extra
  `COPY` of the adapter into `/opt/extensions`. The binary is unchanged, so the same image still runs under compose
  on any VPS.
- **It is served through a Lambda Function URL in response-streaming mode**, behind Cloudflare (free plan) for
  the domain, TLS and caching of the web app's static files. A small Cloudflare Worker forwards each request to the
  Function URL, since the free plan cannot rewrite `Host`; Workers Free allows 100k requests a day. CloudFront in
  front of the Function URL is the alternative if that limit is ever reached.
- **Postgres is Neon Free in `aws-ap-southeast-2`**, over the direct endpoint, never the pooler, with autoscaling
  capped at 0.25 CU so the 100 CU-hours cover ~400 awake hours a month.
- **Live sync streams are request-scoped.** Lambda has no background work between invocations, so each open
  stream holds its own `LISTEN` session instead of one listener per instance. The server ends each stream after a
  few minutes, well inside Lambda's 15-minute timeout, and clients resume from their last sequence. The short cap
  bounds what a stream costs after its client has gone. The transport (SSE or WebSockets) is decided in #175.
- **Migrations run as a deploy step**, not on start (`MIGRATE_ON_START=false`, [ADR-0011](0011-api-binary-and-migrations.md)).
- **Backups are ours**: a nightly `pg_dump` to object storage with a restore drill (#115), since Neon Free keeps
  only 6 hours of history.
- **Fallback**: if a free tier is cut or outgrown, the same image moves to a Sydney VPS under compose (OVHcloud
  VPS-1, ~A$6.29 a month) with no code change.

## Consequences

- At low traffic production costs nothing. A rough session load (5 players, 4 hours, 4 sessions a month, 512 MB)
  is ~144k of the 400k free GB-s; AWS egress is free to 100 GB a month and Workers Free covers the proxy.
- Cold starts: the first request after idle waits for Lambda to start the 83 MB binary and for Neon to wake,
  roughly 1-2 seconds.
- Each open stream is one Postgres connection and keeps Neon awake, which spends its 100 CU-hours. Fine for a few
  campaigns at once; a shared fan-out (for example a Cloudflare Durable Object) is the next step if not.
- Neon Free's limits are the main risk, because hitting one suspends the database rather than billing:
  - 1 GB of storage: imported content ([ADR-0003](0003-content-as-data-imported-from-foundry.md)) across books and
    locales is not yet measured. Measure it before production.
  - 5 GB of egress: every query result leaves Neon for Lambda over the internet. Content browsing should come from
    the public content caches (Epic 2.8) and Cloudflare, not from Postgres on every request.
  - Neon Launch removes the suspension ($0.106/CU-hour, $0.35/GB-month, 500 GB egress, no minimum), so leaving the
    free tier is a plan change, not a migration. Alert on usage before the limits (#116).
- No in-process state may outlive a request: caches are per instance and timers do not run between requests.
- The Worker is one more deployable, and every request counts against its daily limit.
- Response streaming is not offered in every AWS region; confirm `ap-southeast-2` when provisioning (#113).
