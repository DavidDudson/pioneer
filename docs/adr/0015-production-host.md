# 0015. Production on AWS Lambda and Neon free tiers, in Sydney

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

| Option                                                    | Region         | ~Monthly         | Egress: included, then                                        | Long-lived conn + `LISTEN`   | Backups                    | Ops    | Exit cost                                                           |
| --------------------------------------------------------- | -------------- | ---------------- | ------------------------------------------------------------- | ---------------------------- | -------------------------- | ------ | ------------------------------------------------------------------- |
| Hetzner CAX11 + compose + Cloudflare                      | EU only        | €7.70            | 20 TB, then €1/TB                                             | Yes                          | +20% (disk)                | High   | Low: compose and `pg_dump`                                          |
| OVHcloud VPS-1 + compose + Cloudflare                     | Sydney         | A$6.29 (from)    | 500 GB, then throttled to 10 Mbps                             | Yes                          | Daily, included            | High   | Low: compose and `pg_dump`; any commitment runs out                 |
| Lightsail 2 GB + compose + Cloudflare                     | Sydney         | 12               | 1.5 TB (half the bundle in Sydney), then per GB               | Yes                          | Snapshots $0.05/GB         | High   | Low: compose and `pg_dump`                                          |
| Fly.io app + self-run Postgres                            | Sydney         | ~16              | None, $0.04/GB (~$2 of the total)                             | Yes                          | Volume snapshots           | Medium | Low: same image; `pg_dump`                                          |
| Railway Hobby                                             | Singapore only | ~10              | None, $0.05/GB (~$2.50 of the total)                          | Yes                          | Volume backups             | Low    | Low: same image; `pg_dump` over its public proxy                    |
| Cloud Run + Neon (direct endpoint) + Cloudflare           | Sydney         | ~70+             | 1 GB in North America, then from $0.12/GiB (~$6 of the total) | Only pinned warm             | Neon PITR                  | Low    | Low: same image; `pg_dump` from Neon                                |
| Vercel + Neon                                             | Sydney         | 0 Hobby / 20 Pro | 100 GB on Hobby                                               | No: functions, not our image | Neon                       | Low    | High: the API rewritten as Vercel functions                         |
| Oracle Always Free (Arm 2 OCPU / 12 GB)                   | Sydney         | 0                | 10 TB                                                         | Yes                          | Own                        | High   | Low: compose and `pg_dump`                                          |
| **AWS Lambda + Neon Free (direct endpoint) + Cloudflare** | Sydney         | **0**            | AWS 100 GB, then from $0.09/GB; Neon 5 GB to Lambda           | Per stream, see below        | Own `pg_dump` to R2 (free) | Medium | Low: same image under compose; the Worker and IAM setup are dropped |

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
- **Lambda runs a copy of the arm64 image from ECR.** Lambda pulls only from ECR in its own account and only
  single-architecture images, not the multi-arch index on GHCR. Each deploy copies the arm64 image for its
  `sha-` tag into a private ECR repository that keeps the last five images, a few cents a month in storage.
- **Provisioning is OpenTofu in `infra/`**, covering AWS, Cloudflare and Neon. Its state lives in R2 and is
  encrypted on the client, since it holds the generated secrets. The runbook is [Production](../production.md).
- **It is served through a Lambda Function URL in response-streaming mode**, behind Cloudflare (free plan) for
  the domain, TLS and caching of the web app's static files. A small Cloudflare Worker forwards each request to the
  Function URL, since the free plan cannot rewrite `Host`; Workers Free allows 100k requests a day. CloudFront in
  front of the Function URL is the alternative if that limit is ever reached.
- **Only the Worker can reach the Function URL.** The Function URL uses `AWS_IAM` auth, and the Worker signs each
  request with SigV4 using an IAM user whose keys are held as Worker secrets. A Function URL with `AWS_IAM` auth
  needs both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`; that user gets both on this function only,
  with `lambda:InvokeFunction` conditioned on `lambda:InvokedViaFunctionUrl` so the keys cannot invoke the
  function any other way. Unsigned requests to the `*.lambda-url.ap-southeast-2.on.aws` hostname are refused, so
  nothing bypasses Cloudflare's TLS, caching and rate limits. With CloudFront instead, origin access control signs
  the requests.
- **Postgres is Neon Free in `aws-ap-southeast-2`**, over the direct endpoint, never the pooler, with autoscaling
  capped at 0.25 CU so the 100 CU-hours cover ~400 awake hours a month.
- **Live sync streams are request-scoped.** Lambda has no background work between invocations, so each open
  stream holds its own `LISTEN` session instead of one listener per instance. The server ends each stream after a
  few minutes, well inside Lambda's 15-minute timeout, and clients resume from their last sequence. The short cap
  bounds what a stream costs after its client has gone. The transport is Server-Sent Events ([ADR-0017](0017-live-sync-over-server-sent-events.md)).
- **Migrations run as a deploy step**, not on start (`MIGRATE_ON_START=false`, [ADR-0011](0011-api-binary-and-migrations.md)).
- **GitHub Actions deploys every merge to `main`** (#114). Jobs in the repository's `production` environment, which
  allows `main` only, assume an IAM role over OIDC, so no AWS keys live in GitHub. The runner copies the image to
  ECR, migrates Neon with it, then points the function at it and checks `/api/health`; rolling back redeploys an
  earlier `sha-` tag. The role can read the function's environment, which it needs for `DATABASE_URL` anyway; a
  separate copy of the secret in GitHub or SSM was the alternative, at the cost of a second place to rotate it.
- **Backups are ours**: a nightly compressed `pg_dump` to Cloudflare R2 with a restore drill (#115), since Neon
  Free keeps only 6 hours of history. Keeping 7 daily and 4 weekly dumps of a database capped at 1 GB stays well
  inside R2's free 10 GB-month of storage, and R2 does not charge for egress, so restores are free too.
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
- The Worker is one more deployable, every request counts against its daily limit, and its IAM keys need rotating.
- Response streaming through Function URLs is offered in every commercial AWS region since April 2026, so
  `ap-southeast-2` is covered (checked when provisioning, #113).
- Production costs a few cents a month, not exactly nothing, for ECR storage of the last five images (~110 MB
  each).
