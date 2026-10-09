# Content model

Content is everything the rules define: traits, statistics, conditions, actions, ancestries, heritages,
backgrounds, classes and their features, feats, spells, equipment, runes, deities, languages, creatures. It is data
in the database, never code.

## Content entry

Every entry, of every kind, shares one envelope. Kind-specific data hangs off it with its own zod schema.

```ts
interface ContentEntry<K extends ContentKind> {
  id: ContentId; // UUIDv5 of `<pack>/<slug>` (existing scheme, unchanged)
  pack: PackId;
  kind: K;
  slug: Slug; // permanent once published
  name: string;
  level?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  traits: readonly TraitSlug[];
  sources: readonly SourceRef[]; // at least one, see below
  description: RichText; // ORC rules text for official content, author text for homebrew
  rules: readonly RuleElement[];
  display?: DisplayHints; // e.g. feat display category override, see play-and-campaigns.md
  externalIds?: { foundry?: string; aon?: string; pathbuilder?: string };
  supersedes?: readonly ContentId[]; // remaster entry replacing a legacy one
  data: KindData[K];
}
```

### Kinds

| Group      | Kinds                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Rules core | `statistic`, `trait`, `condition`, `action`, `damage-type`, `sense`, `language`, `variant-rule` |
| Build      | `ancestry`, `heritage`, `background`, `class`, `class-feature`, `feat`, `archetype`, `deity`    |
| Magic      | `spell` (incl. focus spells and cantrips), `ritual`, `spellcasting-tradition`                   |
| Equipment  | `weapon`, `armor`, `shield`, `equipment`, `consumable`, `rune`, `treasure`, `kit`               |
| Play       | `effect` (spell and feat effects, GM effects)                                                   |
| Bestiary   | `creature`, `hazard` (later milestone)                                                          |

Class progression (features by level, feat slots, skill increases, boosts) is data on the `class` entry, expressed
as `GrantItem` and slot-granting rule elements keyed by level. The builder's choice slots fall out of the engine;
nothing about level 1 to 20 is hard-coded.

Statistics are content too: a `statistic` entry names a selector, its domains, an actor-only base formula, and
whether it is a check or a DC (see [rules-engine.md](rules-engine.md#statistics-are-content)).

### Rich text

Descriptions are stored as a small, safe document AST, not HTML: `RichText` in `libs/rules/sdk` (`rich-text.ts`).
A document is an array of blocks:

| Block       | Fields                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `paragraph` | `content`: inline nodes                                                      |
| `heading`   | `level` 1 to 3, below the entry's own title; `content`                       |
| `list`      | `ordered`; `items`, each a run of blocks, so items hold paragraphs and lists |
| `table`     | `caption?`, `header?` (one row of cells), `rows`; a cell is inline nodes     |
| `rule`      | a thematic break, as before a spell's heightened entries                     |

Inline nodes carry semantics so text stays live:

- `text`: a run of text, with `marks` `emphasis` and `strong`. Always text: `<b>` in it is four characters.
- `ref`: a link to another content entry by `ContentId` ("[Off-Guard]", "[Seek]"), with an optional `label`; the
  name comes from the entry otherwise.
- `check`: a `statistic` selector, optional `dc`, `basic` and roll `options` ("DC 20 Athletics"), rollable later.
- `damage`: a `formula` of dice and a formula (`2d6`, `1d8 + @attr.str`) and an optional `damageType` ("2d6
  fire"), rollable later. The non-dice part is checked against the formula reference vocabulary.
- `template`: an area `shape` and `size` in feet ("20-foot burst").
- `duration`: a `count` of rounds, minutes, hours or days.
- `action-cost`: an action glyph (`one`, `two`, `three`, `free`, `reaction`), spelled out for screen readers.

There is no line break node: the importer splits `<br>` into paragraphs. A document may nest at most 24 levels of
JSON and hold at most 5000 arrays and objects; anything bigger is rejected before the schema walks it.

`libs/rules/ui` renders it: `pio-rich-text` builds every node from frontier components and never sets HTML. Pages
give it links and names for references and statistics with `provideRichTextLinks`; without them a reference shows
its label and links nowhere. The rules playground's "Rich text" mode validates a document and previews it.

The importer converts Foundry's HTML and enrichers (`@UUID[...]`, `@Check[...]`, `@Damage[...]`, `@Template[...]`)
into this AST.

## Books and source references

Sources are first-class. `content/books.json` is the registry:

```ts
interface Book {
  id: BookId; // 'player-core', 'gm-core', 'monster-core'
  title: string; // 'Pathfinder Player Core'
  publisher: string;
  license: 'ORC' | 'Paizo-CUP' | 'OGL' | 'homebrew';
  remaster: boolean;
  released?: PlainDate;
  aonSourceUrl?: Url; // the book's AoN Sources page
}

type SourceRef =
  | { kind: 'book'; book: BookId; page?: number; aon?: Url }
  | { kind: 'web'; url: Url; title?: string }
  | { kind: 'homebrew'; author: UserId; pack: PackId; url?: Url };
```

Validation: every entry needs at least one source; a `book` source needs a `page`, an `aon` URL, or both. AoN URLs
must be on `2e.aonprd.com` and point at an exact entry (`/Feats.aspx?ID=…`), not a search page. The content
browser shows "Player Core p. 123 · AoN" on every entry. A coverage report lists entries missing a page so they can
be filled in over time.

## Packs and storage

```text
content_books        id, title, publisher, license, remaster, ...
content_packs        id, title, owner_id (null = official), visibility, license, version, content_hash
content_entries      id, pack_id, kind, slug, name, level, rarity, traits text[], data jsonb,
                     search tsvector, updated_at
content_pack_deps    pack_id, depends_on            -- homebrew extending an official pack
```

- **Official packs** are produced by the importer into `content/packs/<pack>/<kind>.json`, reviewed as normal PRs
  (diffable), and upserted on deploy by id. Errata is a re-import and a diff.
- **Homebrew packs** are created in the app and owned by a user. Visibility is private, campaign or public.
- **Overriding official content** in homebrew is a new entry with `supersedes` pointing at the official one.
  The registry resolves supersession per character or campaign, so a GM can house-rule a feat without touching
  the official row.
- **Enabled packs** are chosen per campaign (and per character outside campaigns). The registry is built from
  exactly those packs.

The existing TS content libraries (`libs/content/player-core`, `libs/content/monster-core`) are retired. Thousands
of entries as TypeScript would slow typechecking for no benefit, and homebrew cannot use that path.

### Delivery to the browser

The engine runs client-side, so the browser needs content. Packs are served as immutable, content-hashed bundles
split by kind and by purpose, cached in IndexedDB, and loaded lazily (spells only when a caster needs them):

| Bundle                                               | Contents                                 | Loaded                         |
| ---------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `player-core/feat.mech.<hash>.json`                  | ids, levels, traits, rule elements, data | when the engine needs the kind |
| `player-core/feat.names.<locale>.<hash>.json`        | names, short summaries                   | with the mechanics bundle      |
| `player-core/feat.desc.<locale>.<shard>.<hash>.json` | descriptions, sharded by id prefix       | when an entry is opened        |

Mechanics never depend on locale, so switching language downloads only text. Likely-next bundles are prefetched
when idle. Content browser search is server-side through per-locale `tsvector` and trait/level indexes.

## Localisation

Names, descriptions, summaries and rule element labels are translatable; mechanics are not. Text lives in
`content_entry_texts (entry_id, locale, field, text)`, with `en` as the source and per-field fallback, marked in
the UI when a fallback is shown. Homebrew authors can add translations for their packs. Community Foundry
translation modules (Babele-based) can be imported as text-only packs keyed by Foundry id. See
[ADR-0009](../adr/0009-i18n-and-lazy-loading.md).

## Foundry import

`tools/content-import` builds official packs from [foundryvtt/pf2e](https://github.com/foundryvtt/pf2e) at a pinned
release. Their entries already carry rule elements, predicates, traits and `publication { title, license, remaster }`.

```mermaid
flowchart LR
  F[Foundry pf2e packs<br/>pinned tag] --> S[Select<br/>remaster, target books]
  S --> T[Translate<br/>schema + rule elements]
  T --> L[Resolve i18n labels<br/>lang/en.json]
  L --> R[HTML + enrichers<br/>to RichText]
  R --> E[Enrich sources<br/>page + AoN URL]
  E --> V[Validate<br/>zod, refs resolve]
  V --> O[content/packs JSON<br/>+ coverage report]
```

- **Selection.** Only `publication.remaster === true` from the target books. Legacy content is out of scope;
  `supersedes` links are recorded where Foundry marks replacements.
- **Translation.** One translator per Foundry rule element key. Untranslatable elements are kept in a report with
  the entry and raw JSON; the report is the backlog for engine work and a CI artefact on content PRs.
- **Coverage report.** Per kind: entries imported, entries with every rule element translated, entries with page
  numbers, entries with AoN URLs. Milestone exit criteria are written against these numbers.
- **Ids.** Our ids stay UUIDv5 of `<pack>/<slug>`. The Foundry compendium UUID goes in `externalIds.foundry`,
  which is what makes Foundry export possible.
- **Source enrichment.** Foundry has the book title but no page numbers or AoN links. Enrichment comes from a
  committed mapping file (`content/sources/<book>.json`: slug → page, AoN id), filled by a matcher over AoN's
  listing data and corrected by hand. The method of obtaining AoN data must respect their terms; this is an open
  question tracked in the roadmap. Until resolved, entries ship with the book reference and whatever page or URL
  is known, and the coverage report shows the gap.

## Licensing

Imported content is ORC-licensed remaster material, so rules text is stored and displayed with ORC attribution.
Reserved Material (Paizo trade dress, art, Golarion names outside ORC) is not imported, or is handled under the
Community Use Policy. Foundry's own permission comes from its partnership agreement with Paizo, which does not
extend to Pioneer, so Foundry's data is never a licence for anything outside ORC. NOTICE.md is updated in
milestone 0 to reflect that prose is stored.

The public Legal page (footer link on every page, no account) states that all official content is derived from
the Foundry pf2e system at the pinned release, carries the Paizo Community Use and ORC notices, and lists the
content caches (pack bundles by kind, Foundry release, content hash) for download. It is generated from pack
manifests and the book registry. See [ADR-0003](../adr/0003-content-as-data-imported-from-foundry.md) and
[ADR-0007](../adr/0007-oauth-required-public-content.md).
