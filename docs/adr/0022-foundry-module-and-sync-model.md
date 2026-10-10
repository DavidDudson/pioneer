# 0022. Foundry module: link tokens, polling and field ownership

- Status: Proposed
- Date: 2026-10-10

## Context

[ADR-0018](0018-foundry-is-the-live-play-surface.md) moved table play to Foundry VTT and settled that a Pioneer
module in Foundry pulls the campaign's characters, Pioneer always owns the build, and play state follows the
campaign's `play_sync` mode (`foundry`, `pioneer` or `disconnected`). It left distribution, auth, change detection,
how a re-sync spares play state, actor identity and condition mapping to this spike (#216). The stories it shapes
are #217 to #225.

Facts this decision rests on, checked on 2026-10-10:

- Foundry VTT is at v14 (14.368 stable). The pf2e system's current release, 8.5.1, needs core 14.361 and is verified
  on 14.367. A module declares `compatibility.minimum`/`verified`/`maximum` for core and, under
  `relationships.systems`, the same for pf2e. Foundry installs and updates a package from its manifest URL, whose
  `download` names the zip for that version.
- The module runs in each connected user's browser, on the Foundry server's origin: self-hosted
  (`http://localhost:30000`, a LAN address, a domain) or a host such as The Forge. Calls to Pioneer are
  cross-origin, so Pioneer must answer CORS preflights.
- Foundry sends world-scope settings to every connected client. Client-scope settings live in one browser's
  storage; user-scope settings belong to one user.
- The edge Worker owns the `Authorization` header: it signs every request to the Function URL with SigV4 and drops
  any client value (ADR-0015, `apps/edge/src/proxy.ts`).
- The CSRF guard only checks writes that carry the session cookie (`csrf-guard.ts`); a request without the cookie
  passes it and acts as nobody unless something else authenticates it.
- Characters have one `version` column for optimistic concurrency. Play state (#38) is not built yet.

Change detection had two candidates, for a 4-hour session on ADR-0015's host (Lambda at 512 MB, 400k GB-s and 1M
requests free a month; Workers Free at 100k requests a day; Neon scales to zero after 5 idle minutes):

| Criterion              | Poll a campaign revision every 10 s                                                                | Server-Sent Events stream (ADR-0017's shape)                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Lambda duration        | 1,440 requests of ~50 ms: ~36 GB-s a session, ~144 GB-s a month at four sessions                   | One execution held for the whole session: ~7,200 GB-s a session, ~28,800 GB-s a month, so the free tier covers ~13 campaigns        |
| Requests               | 5,760 a month per campaign; the 1M free cover ~170 campaigns, Workers Free ~69 sessions on one day | 48 reconnects a session (5-minute cap)                                                                                              |
| Concurrency            | None held                                                                                          | One Lambda execution and one Postgres connection per open world                                                                     |
| Neon                   | Awake for the session (polls are under 5 minutes apart)                                            | Awake for the session                                                                                                               |
| Latency                | Up to the interval                                                                                 | Under a second                                                                                                                      |
| What it needs          | A cheap revision query and a conditional `GET`                                                     | A `LISTEN` per stream and a `NOTIFY` from every write that changes what the module sees, across the character and campaign contexts |
| Behind NAT, in Foundry | Plain `fetch`                                                                                      | `EventSource` cannot set headers, so the token would ride in the URL, into logs                                                     |

Ten seconds is fast enough for a player's HP change in Pioneer to reach the actor during play, and build changes
are rarer still.

## Decision

### Distribution

- **The module is an Nx project, `apps/foundry-module`**, in TypeScript and bundled to one ES module. Its id is
  `pioneer`. It is released with the API: CI attaches `module.zip` and `module.json` to a GitHub release tagged
  `foundry-module-v<semver>`.
- **The manifest URL is Pioneer's own**: `https://<pioneer>/foundry/module.json`, a static file shipped with the web
  app, whose `download` points at that release's zip. GitHub's `releases/latest` is shared by every release in the
  repository, and serving the manifest from Pioneer means Foundry offers the module version that matches the API
  that is actually deployed.
- **Compatibility is pinned to what we test**: core `minimum` 14.361, `verified` the version the golden pregens
  were checked on (#215), no `maximum`; pf2e under `relationships.systems` with `minimum` the pinned pf2e release
  the importer and exporter target and `verified` the same. Bumping the pinned pf2e release bumps both.
- **The API states the module versions it serves.** Every module request sends `Pioneer-Module-Version`. A version
  below the API's minimum gets a `426` problem, and the module shows the GM a notice to update instead of syncing.
  Module routes are versioned under `/api/foundry/v1`.

### Auth

- **A link token per campaign.** The GM creates it on the campaign home and sees it once: `pnr_link_` followed by
  256 random bits in base64url. Only its SHA-256 is stored, in `campaign_links`, like invites. The prefix lets
  secret scanners recognise a leaked token.
- **One live link per campaign.** Creating a link revokes the previous one in the same transaction, so rotation is
  "create a new one". The GM can also revoke without replacing. A GM handover keeps the link; deleting the campaign
  deletes it.
- **The token travels in a `Pioneer-Link-Token` header**, not `Authorization`, which the edge Worker owns.
- **The token's scope is one campaign and the module routes only.** It can read the campaign's party, its sync
  mode, each attached character's actor JSON and play state, and write play state. Module routes accept nothing
  else, and other routes ignore the header. It is checked against the database on every request (an index on the
  hash), so a revocation takes effect on the next poll. `last_used_at` is written at most once an hour, so polling
  writes nothing.
- **CORS on module routes only**: `Access-Control-Allow-Origin: *`, the module's headers allowed, no credentials.
  The token is the only credential and the module sends requests with `credentials: 'omit'`, so no session cookie
  reaches these routes and the CSRF guard has nothing to check. An origin allowlist would add nothing (the token
  already proves who is calling) and would break every self-hosted world.
- **The token is stored in the GM's user-scope setting, never a world setting**, since world settings reach every
  player's browser and the token can write play state for the whole party. #217 confirms that Foundry withholds a
  user-scope setting from other users; if it does not, the token goes in client scope (one browser) instead.

### Change detection

- **The module polls.** Only the active GM's client (`game.users.activeGM`) polls, so a full table costs the same as
  the GM alone. Players' clients make no calls to Pioneer.
- **One conditional request per poll**: `GET /api/foundry/v1/campaign` with `If-None-Match`. The response lists the
  sync mode and each attached character's id, player, `buildRevision` and `playRevision`, and its `ETag` is derived
  from exactly those, so nothing has to be written to bump it. Unchanged state is a `304` with no body. Responses
  carry `Cache-Control: no-store`.
- **The server sets the interval**: each response carries `pollAfterSeconds` (10 by default, never under 5 in the
  module), so it can be slowed without a module release.
- **Characters get two revisions**, both counters: `build_revision` for the build and `play_revision` for play
  state. With one, a play-state write in `foundry` mode would look like a build change and trigger a re-sync, and a
  re-sync would post play state back.
- When a revision moves, the module fetches only that character's actor JSON (`GET .../characters/:id/actor`) or
  play state (`GET .../characters/:id/play`).
- SSE (ADR-0017's shape) stays the upgrade path if polling latency ever matters. The module's sync logic sits behind
  a change-feed port, so only the transport would change.

### Field ownership and re-sync

- **Pioneer owns the build**: the actor's identity and details, and every item it exported (ancestry, heritage,
  background, class, feats, features, inventory, spellcasting entries, spells, lores). Each such item carries
  `flags.pioneer.itemKey`, a key stable across exports.
- **A build re-sync updates items in place**, matched by `itemKey`: changed items are updated, new ones created,
  missing ones deleted. In-place updates keep item ids, so macros, hotbar slots and effect origins survive. Items
  without the flag (added in Foundry, conditions, effects) are never touched by a build re-sync.
- **Play-state fields are left out of a build update**: `system.attributes.hp.value` and `.temp`, dying, wounded,
  hero points, focus points, spell slots expended, item uses, and condition and effect items. Which of these the
  module writes, if any, is up to the mode below.
- **Play state by mode**, read from each poll:
  - `foundry`: the module hooks `updateActor`, `createItem`, `updateItem` and `deleteItem` on linked actors, waits
    1 second for a burst to settle, and sends `PUT .../characters/:id/play` with a **full snapshot** and the
    actor's `_stats.modifiedTime` as `observedAt`. The server keeps the newest snapshot and ignores an older one
    (`applied: false`), so retries and reordering are harmless. A `PUT` in any other mode is a `409` problem. On
    entering this mode the module sends a snapshot of every linked actor at once.
  - `pioneer`: on a new `playRevision` the module writes Pioneer's play state to the actor and reconciles its
    condition and effect items to Pioneer's set, removing ones Pioneer does not have. Foundry edits stand until
    that next write. It never posts.
  - `disconnected`: neither direction.
- **The module's own writes are marked** with `{ pioneer: true }` in the update options, and its hooks skip them, so
  a re-sync never echoes back as a play-state post.

### Actor identity

- **Actors carry `flags.pioneer`**: `characterId`, `campaignId`, `buildRevision` and `playRevision`. The module
  finds an actor by `characterId`, never by name. Only world actors count; unlinked token actors are ignored, and
  imported actors get a linked prototype token (`actorLink: true`). If two world actors claim one character (a
  duplicated actor), the module syncs the older one and warns the GM.
- **Players map to Foundry users in the module.** The import panel lists each character with its Pioneer player
  and a picker of the world's users, defaulting to the user whose name matches the player's name. The choice
  becomes the actor's `ownership` (owner for that user, the world default otherwise) and is kept in a world setting
  keyed by Pioneer member id, so a re-import keeps it. Pioneer never learns Foundry user ids.
- **Detaching a character** in Pioneer drops it from the poll. The module leaves the actor in place, clears its
  link flags and tells the GM, rather than deleting what may hold session history.

### Condition and effect mapping

- **Conditions map by slug.** Pioneer's conditions are imported from pf2e with `externalIds.foundry`, so a
  condition item's slug and value (frightened 2) map both ways without a table to maintain.
- **Effects map by compendium source**: a Foundry effect item's `_stats.compendiumSource` to the Pioneer entry with
  that external id, and back.
- **Unmapped conditions and effects are kept, not dropped.** A `foundry`-mode snapshot can carry ones Pioneer does
  not know (homebrew, another module's). They are stored as foreign entries with their Foundry name and UUID, shown
  on the sheet without mechanics, and listed in the sync report, as #220 asks.
- The mapping lives in `libs/interop/foundry` beside the exporter, as one table read in both directions, so #220 and
  #225 share it and round-trip tests cover it.

## Consequences

- #217 builds `campaign_links` (`token_hash` unique, one live row per campaign), the link-token authenticator, CORS
  on `/api/foundry/v1`, the `426` version check, and the module skeleton with the manifest served by the web app.
  It also confirms the user-scope setting assumption above.
- #219 adds `build_revision` and `play_revision` to `characters`. Every build write increments the first and every
  play-state write the second. Play state (#38) must arrive as a part of the character that can be written without
  touching the build.
- Every exported item needs a stable `itemKey`, so the exporter (#211) must derive it from the character's own ids,
  not from array positions.
- A Foundry world with no GM connected does not sync. That is when nobody plays, so nothing is lost; the first GM
  poll catches up.
- Polling costs a fraction of streaming on Lambda and needs no cross-context `NOTIFY`. Its price is up to ten
  seconds before a change shows, which the server can shorten per campaign.
- Anyone with the token can rewrite the party's play state in `foundry` mode. It never reaches players' browsers,
  revocation is immediate, and a leak costs HP and conditions, not builds or accounts.
- The module is a new release artifact with its own compatibility range; a pf2e system update that changes the
  actor schema needs a module and exporter release, checked against the golden pregens (#215).
