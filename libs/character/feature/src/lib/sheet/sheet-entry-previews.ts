import { inject } from '@angular/core';
import { equippedRules, itemContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { LinkTarget } from '@pioneer/frontier';
import { ContentLoader } from '@pioneer/rules/data-access';
import { alterAction, EffectMode, spellAtRank } from '@pioneer/rules/engine';
import type { AlteredAction } from '@pioneer/rules/engine';
import { ContentKind, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, RichText, SpellRank } from '@pioneer/rules/sdk';
import { entryTarget } from '@pioneer/rules/ui';
import type { EntryPreview, EntryPreviews, PreviewEffect, PreviewRanks } from '@pioneer/rules/ui';

import { injectStatisticLink } from './sheet-breakdown/sheet-breakdown';
import { sheetEntryEffects } from './sheet-entry-effects';
import { sheetSlotContent } from './sheet-slot-content';

/** Entries by registry: a loaded registry never changes, so each is indexed once. */
const ENTRIES = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, ContentEntry>>();

function entriesOf(registry: ContentRegistry): ReadonlyMap<ContentId, ContentEntry> {
  const indexed =
    ENTRIES.get(registry) ??
    new Map(registry.packs.flatMap((pack) => pack.otherEntries).map((entry) => [entry.id, entry]));
  ENTRIES.set(registry, indexed);
  return indexed;
}

/** The entry `id` names in a loaded registry, with all it carries; undefined when the registry doesn't hold it. */
export function sheetEntry(registry: ContentRegistry, id: ContentId): ContentEntry | undefined {
  return entriesOf(registry).get(id);
}

/**
 * What the sheet's references and rows preview of an entry: its name, level, traits, description and sources, read
 * from the loaded registry. An entry the registry doesn't hold, or a registry still loading, has no preview, so its
 * reference reads as it did.
 */
export function sheetEntryPreview(registry: ContentRegistry | undefined, id: ContentId): EntryPreview | undefined {
  const entry = registry === undefined ? undefined : sheetEntry(registry, id);
  return entry === undefined ? undefined : previewOf(entry);
}

/** A cantrip heightens by the caster's level, not by a rank picked, so its card offers no pick. */
const CANTRIP = Trait.parse('cantrip');

/** A spell's ranks: the spell cast at each from its own up. None for any other entry, and for a cantrip. */
function ranksOf(entry: ContentEntry): PreviewRanks | undefined {
  if (entry.kind !== ContentKind.Spell || entry.traits.includes(CANTRIP)) {
    return undefined;
  }
  const { data } = entry;
  return { from: data.rank, cast: (rank) => spellAtRank(data, rank) };
}

function previewOf(entry: ContentEntry): EntryPreview {
  const ranks = ranksOf(entry);
  return {
    name: entry.name,
    level: 'level' in entry ? entry.level : undefined,
    traits: entry.traits,
    summary: entry.description,
    sources: entry.sources,
    ...(ranks === undefined ? {} : { ranks }),
  };
}

/**
 * `preview` of an action as the elements in play change it for `character` (`alterAction`): the traits and damage a
 * granted action reads with, such as Dragon Breath's. Derived when the card opens. Any other entry, as it is.
 */
function withAlterations(
  preview: EntryPreview,
  entry: ContentEntry,
  { registry, character }: { readonly registry: ContentRegistry; readonly character: Character },
): EntryPreview {
  if (entry.kind !== ContentKind.Action) {
    return preview;
  }
  const kept: { altered: AlteredAction | undefined } = { altered: undefined };
  const altered = (): AlteredAction => {
    kept.altered ??= alterAction(
      equippedRules(character.document, itemContent(registry), sheetSlotContent(registry)),
      entry,
    );
    return kept.altered;
  };
  // Inherits the preview, effects included, so that nothing is derived until a card reads the traits or summary.
  // oxlint-disable-next-line typescript/no-unsafe-assignment -- Object.create is typed any; the result is the preview
  const derived: EntryPreview = Object.create(preview);
  return Object.defineProperties(derived, {
    traits: { get: (): readonly string[] => altered().traits, enumerable: true },
    summary: { get: (): RichText => altered().description, enumerable: true },
  });
}

/**
 * `entry`'s preview with what it would do to `character`, derived against `registry` (the one the sheet derives from,
 * which the entry may not be in). Without a character or that registry, the preview has no effects section.
 */
function previewOnCharacter(
  entry: ContentEntry,
  registry: ContentRegistry | undefined,
  character: Character | undefined,
): EntryPreview {
  const preview = previewOf(entry);
  if (registry === undefined || character === undefined) {
    return preview;
  }
  // Derived on first read, when the card opens. Every row asks whether it can preview.
  // Deriving the statistics for each would cost the sheet a render.
  const kept: { effects: readonly PreviewEffect[] | undefined } = { effects: undefined };
  const { ranks } = preview;
  if (ranks !== undefined) {
    // Each rank derives the first time it is picked; a card shows one rank at a time.
    const keptByRank = new Map<SpellRank, readonly PreviewEffect[]>();
    const effects = (rank: SpellRank): readonly PreviewEffect[] => {
      const known = keptByRank.get(rank);
      if (known !== undefined) {
        return known;
      }
      const derived = sheetEntryEffects(registry, character, { entry, mode: EffectMode.WouldApply, rank });
      keptByRank.set(rank, derived);
      return derived;
    };
    return { ...preview, ranks: { ...ranks, effects } };
  }
  const withEffects: EntryPreview = {
    ...preview,
    get effects(): readonly PreviewEffect[] {
      kept.effects ??= sheetEntryEffects(registry, character, { entry, mode: EffectMode.WouldApply });
      return kept.effects;
    },
  };
  return withAlterations(withEffects, entry, { registry, character });
}

/**
 * The previews a container provides for its rows, read from the registry it has loaded; none while that is loading.
 *
 * ```ts
 * providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(Shop).previews }]
 * ```
 */
export function sheetEntryPreviews(registry: () => ContentRegistry | undefined): EntryPreviews {
  return { preview: (id) => sheetEntryPreview(registry(), id) };
}

/** The kinds the sheet's action, Strike, effect and condition rows name, so a card fetches these and no others. */
const FETCHED_PREVIEW_KINDS: readonly ContentKind[] = [
  ContentKind.Action,
  ContentKind.Condition,
  ContentKind.Effect,
  ContentKind.Weapon,
];

/**
 * The previews for the rows that name entries of those kinds (actions, Strikes, effects): from the registry the sheet
 * has loaded, and for an entry it doesn't hold, from the bundles of `kinds`, fetched when its card first opens and
 * kept for the next. Each card links to the entry's page, whether the sheet or the fetch holds the entry.
 */
export function sheetFetchingPreviews(
  registry: () => ContentRegistry | undefined,
  character: () => Character | undefined,
  kinds: readonly ContentKind[] = FETCHED_PREVIEW_KINDS,
): EntryPreviews {
  const loader = inject(ContentLoader);
  const kept: { attempt: Promise<ContentRegistry> | undefined; fetched: ContentRegistry | undefined } = {
    attempt: undefined,
    fetched: undefined,
  };
  const fetchKinds = async (): Promise<ContentRegistry> => {
    kept.attempt ??= loader.registry(kinds);
    const { attempt } = kept;
    try {
      kept.fetched = await attempt;
      return kept.fetched;
    } catch (error) {
      // Only its own failure: a retry already under way is not this attempt's to forget.
      if (kept.attempt === attempt) {
        kept.attempt = undefined;
      }
      throw error;
    }
  };
  const target = (id: ContentId): LinkTarget | undefined => {
    const held = registry();
    const entry = (held === undefined ? undefined : sheetEntry(held, id)) ?? sheetEntryIn(kept.fetched, id);
    return entry === undefined ? undefined : entryTarget(entry);
  };
  const onCharacter = (entry: ContentEntry | undefined): EntryPreview | undefined =>
    entry === undefined ? undefined : previewOnCharacter(entry, registry(), character());
  return {
    preview: (id) => {
      const held = registry();
      return onCharacter(held === undefined ? undefined : sheetEntry(held, id));
    },
    load: async (id) => onCharacter(sheetEntryIn(await fetchKinds(), id)),
    target,
    statistic: injectStatisticLink(),
  };
}

function sheetEntryIn(registry: ContentRegistry | undefined, id: ContentId): ContentEntry | undefined {
  return registry === undefined ? undefined : sheetEntry(registry, id);
}
