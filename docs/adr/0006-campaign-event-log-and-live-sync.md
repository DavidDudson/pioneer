# 0006. Campaign event log with WebSocket and LISTEN/NOTIFY

- Status: Proposed
- Date: 2026-10-08

## Context

Campaigns need live views of other characters, a combat log, shared rolls and an encounter tracker. We do not
want new infrastructure (message brokers, CRDT servers) for a text-only companion app.

## Decision

Live play is recorded as an append-only `campaign_events` table with a per-campaign sequence. Commands write the
event and update the character's play-state projection in one transaction. After commit, the API issues a Postgres
`NOTIFY`; every API instance listens and pushes to its campaign WebSockets. Clients resume from their last sequence.
Campaign dice are rolled on the server.

## Consequences

- Postgres is the only stateful dependency.
- The combat log is a view of the event stream, not a separate store.
- At-least-once, ordered delivery per campaign; clients must handle duplicates by sequence.
- If load ever outgrows LISTEN/NOTIFY, the event table is already the right shape for a broker.
