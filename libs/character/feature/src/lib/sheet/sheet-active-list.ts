import {
  ActiveSpellId,
  canSustain,
  EffectSourceKind,
  SpellSpendKind,
  sustainedRounds,
} from '@pioneer/character/domain';
import type { ActiveEffect, ActiveSpell, EffectInstanceId, SpellSpend } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { EFFECT_CONTENT_KINDS, effectViews } from './sheet-effects';

/** The registry kinds the active list reads: the effects and the spells that are sustained. */
export const ACTIVE_CONTENT_KINDS: readonly ContentKind[] = [...EFFECT_CONTENT_KINDS, ContentKind.Spell];

/** What an active entry is: a sustained spell the character cast, or an effect on the character. */
export const ActiveKind = { Spell: 'spell', Effect: 'effect' } as const;
export type ActiveKind = (typeof ActiveKind)[keyof typeof ActiveKind];

/** One row of the active list: a spell or an effect with where it came from and how long it has left. */
export interface ActiveRow {
  readonly kind: ActiveKind;
  readonly id: ActiveSpellId | EffectInstanceId;
  /** The spell or effect in the content, which the sheet's preview opens. */
  readonly content: ContentId;
  readonly name: string;
  readonly source: EffectSourceKind;
  /** The ally who gave it, for an effect from one. */
  readonly ally: string | undefined;
  /** Rounds left: at most, for a spell that is sustained; absent for an effect with no clock. */
  readonly remaining: number | undefined;
  /** Whether it is a sustained spell, which only lasts while it is sustained. */
  readonly sustained: boolean;
  /** Whether it was cast or sustained since the last End turn, so it lasts to the end of the next. */
  readonly sustainedThisTurn: boolean;
  /** Whether it has rounds left to be sustained once more. */
  readonly canSustain: boolean;
  /** Whether ending it during a turn takes the Dismiss action. */
  readonly dismissAction: boolean;
  /** Whether its rounds can be edited: an effect from another creature, whose turns the sheet does not know. */
  readonly editable: boolean;
}

/** The active spells and effects of a play state, which the list is made from. */
export interface ActiveLists {
  readonly activeSpells: readonly ActiveSpell[];
  readonly effects: readonly ActiveEffect[];
}

type SpellEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Spell }>;

/** The spells of the registry's packs by id. */
function spellEntries(registry: ContentRegistry): ReadonlyMap<ContentId, SpellEntry> {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(entries.flatMap((entry) => (entry.kind === ContentKind.Spell ? [[entry.id, entry] as const] : [])));
}

/** The row of an active spell; a spell the content lacks is left out. */
function spellRow(active: ActiveSpell, entries: ReadonlyMap<ContentId, SpellEntry>): ActiveRow[] {
  const entry = entries.get(active.spell);
  if (entry === undefined) {
    return [];
  }
  return [
    {
      kind: ActiveKind.Spell,
      id: active.id,
      content: active.spell,
      name: entry.name,
      source: EffectSourceKind.Self,
      ally: undefined,
      remaining: active.remaining,
      sustained: true,
      sustainedThisTurn: active.sustainedThisTurn,
      canSustain: canSustain(active),
      dismissAction: entry.data.dismiss === true,
      editable: false,
    },
  ];
}

/** Every active spell and effect of `play` in one list: the spells first, then the effects. */
export function activeRows(registry: ContentRegistry, play: ActiveLists): readonly ActiveRow[] {
  const entries = spellEntries(registry);
  const effects = effectViews(registry, play.effects).map((view): ActiveRow => ({
    kind: ActiveKind.Effect,
    id: view.id,
    content: view.effect,
    name: view.name,
    source: view.source.kind,
    ally: view.source.name,
    remaining: view.remaining,
    sustained: false,
    sustainedThisTurn: false,
    canSustain: false,
    dismissAction: false,
    editable: view.source.kind !== EffectSourceKind.Self && view.remaining !== undefined,
  }));
  return [...play.activeSpells.flatMap((spell) => spellRow(spell, entries)), ...effects];
}

/** How many spells and effects are active, for the count the header shows. */
export function activeCount({ activeSpells, effects }: ActiveLists): number {
  return activeSpells.length + effects.length;
}

/**
 * The active-spell change casting `spell` records, when its content is sustained: a new active spell at the rank the
 * content gives, for as long as it can be kept up. Casting any other spell, or something that is no spell, records none.
 */
export function sustainedCast(registry: ContentRegistry, spell: ContentId): SpellSpend | undefined {
  const entry = spellEntries(registry).get(spell);
  const rounds = sustainedRounds(entry?.data.duration);
  if (entry === undefined || rounds === undefined) {
    return undefined;
  }
  return { kind: SpellSpendKind.Cast, id: ActiveSpellId.parse(newId()), rank: entry.data.rank, rounds };
}
