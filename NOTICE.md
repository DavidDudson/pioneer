# Notice: third-party content

Pioneer's **code** is MIT-licensed (see [LICENSE](LICENSE)). Pathfinder
**content** is not ours and is used under the terms below.

## Paizo Community Use Policy

Pioneer uses trademarks and/or copyrights owned by Paizo Inc., used under
Paizo's Community Use Policy
([paizo.com/licenses/communityuse](https://paizo.com/licenses/communityuse)).
We are expressly prohibited from charging you to use or access this content.
Pioneer is not published, endorsed, or specifically approved by Paizo. For
more information about Paizo Inc. and Paizo products, visit
[paizo.com](https://paizo.com).

### What the policy means for this repo

- **Free, always.** No paywalls, paid tiers, sign-up or email gates for
  anything that contains Paizo material. Donations and sponsorships are
  allowed; charging for access is not, and any commercial use beyond the
  policy terminates permission.
- **Show the notice.** The statement above must appear, legibly, wherever the
  content does. The web app renders it in the footer of every page.
- **No trade dress or logos.** Don't make Pioneer look like an official Paizo
  product, and don't use or modify Paizo logos.
- **No restricted material.** Paizo artwork, maps, Pathfinder comics and
  Planet Stories excerpts are excluded unless the Community Use Package
  provides them. No adult or offensive content using Paizo IP.
- **Credit authors and artists** where the policy's material requires it.
- **Revocable.** Paizo can withdraw permission at any time; if it does, the
  affected content must be removed.

## ORC License (remastered mechanics and rules text)

The remastered rules (Player Core, GM Core, Monster Core, and later books) are
published under the [ORC License](https://paizo.com/orclicense), which covers
their game mechanics and rules text but not Reserved Material (trade dress,
art, and the setting names Paizo reserves). Content packs declare their licence
in their manifest (`ContentLicense.Orc`, `PaizoCommunityUse` or `Homebrew`).
ORC packs include rules text, shown with attribution to the source book. Every
entry carries a source reference: book and page, an Archives of Nethys URL, or
both.

## Open Game License (pre-remaster books)

A few things the remastered books still point at, such as the Goloma ancestry, exist only in pre-remaster books
published under the [Open Game License 1.0a](https://github.com/foundryvtt/pf2e/blob/pf2e-8.6.0/static/licenses/OpenGameLicense.md).
Pioneer imports those books whole (`mwangi-expanse`, `secrets-of-magic`, `rage-of-elements`, `character-guide`, `impossible-lands`) and declares them `OGL` in the book registry and pack manifest.
Only Open Game Content is used; Product Identity is not. Section 15 of the licence is reproduced on the Legal page
for each such book. Adding a book to `OGL_BOOKS` means adding its Section 15 notice there too.

## Foundry pf2e system data

Official content packs are imported once from the data in the
[Foundry VTT pf2e system](https://github.com/foundryvtt/pf2e), whose code is
Apache-2.0. Foundry uses Paizo material under its own partnership agreement
with Paizo, which does not extend to Pioneer: Pioneer takes only the
remastered rules content, under the ORC License, and relies on the Community
Use Policy for everything else.

The ORC attribution notice on the Legal page carries every upstream credit in
Foundry's `static/licenses/ORCLicense.md`, plus any book Pioneer imports that
the file omits.

All official content in Pioneer is derived from that data: each pack is
imported once from a recorded Foundry release, then corrected and enriched by
Pioneer contributors (ADR-0031). The app's public Legal page, linked from every
page footer, states this, links the Foundry release each pack was imported
from, and offers the content caches for download without an account.

| Pack                       | Imported from                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `player-core`              | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `player-core-2`            | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `divine-mysteries`         | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `howl-of-the-wild`         | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `war-of-immortals`         | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `gm-core`                  | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `treasure-vault`           | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `mwangi-expanse`           | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `secrets-of-magic`         | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `rage-of-elements`         | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `tian-xia-character-guide` | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `dark-archive-remastered`  | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `character-guide`          | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |
| `impossible-lands`         | [foundryvtt/pf2e `pf2e-8.6.0`](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0) |

The vocabulary each import adds to `core-rules` (traits, senses, damage types,
Lore statistics), under `content/packs/core-rules/imported/<pack>/`, comes from
the same release; the rest of `core-rules` is written by hand.

Only remastered, ORC-licensed entries are imported, except from the books listed in `OGL_BOOKS`
(`libs/interop/foundry/src/select-entries.ts`): pre-remaster books under the Open Game License that the remaster
books still point at (see below). Pioneer is not affiliated
with Foundry Gaming LLC or the pf2e system maintainers.

## Contributor checklist for content packs

1. Declare the licence in the pack manifest.
2. Include rules text only for ORC-licensed material, and always include a
   source reference. This holds for hand edits to imported packs too: text
   comes from the source book or the pinned Foundry data, and Archives of
   Nethys supplies page numbers and links only.
3. No Paizo art, logos or trade dress.
4. Never put Paizo content behind anything that costs money or requires sign-up.
   The content browser, rules text and the Legal page (with content cache
   downloads) stay public without an account.
