import { ContentId, SpellDurationType, SpellRank, SpellTimeUnit } from '@pioneer/rules/sdk';
import type { SpellData } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ActiveSpellId } from './active-spell-id';
import { EffectRounds } from './effects';

export { ActiveSpellId } from './active-spell-id';

/** The most spells a character keeps active at once. */
export const ACTIVE_SPELLS_MAX = 32;

/**
 * A sustained spell the character cast and keeps up: which spell, the rank it was cast at, the rounds it can still last
 * (its maximum less the turns gone by), and whether it has been sustained, or cast, since the last End turn. A spell
 * that was not is the one End turn lists as lapsing.
 */
export const ActiveSpellSchema = z.strictObject({
  id: ActiveSpellId,
  spell: ContentId,
  rank: SpellRank,
  remaining: EffectRounds,
  sustainedThisTurn: z.boolean().default(false),
});
export type ActiveSpell = z.infer<typeof ActiveSpellSchema>;

export const ActiveSpellsSchema = z.array(ActiveSpellSchema).max(ACTIVE_SPELLS_MAX).default([]);

const ONE_ROUND = 1;

/** Rounds in each unit of time a spell's duration is counted in: a round is 6 seconds, so a minute is 10 rounds. */
const ROUND = EffectRounds.parse(1);
const MINUTE = EffectRounds.parse(10);
const HOUR = EffectRounds.parse(600);
const DAY = EffectRounds.parse(14_400);
const WEEK = EffectRounds.parse(100_800);
const MONTH = EffectRounds.parse(432_000);
const YEAR = EffectRounds.parse(5_256_000);

const ROUNDS_PER_UNIT = {
  [SpellTimeUnit.Round]: ROUND,
  [SpellTimeUnit.Minute]: MINUTE,
  [SpellTimeUnit.Hour]: HOUR,
  [SpellTimeUnit.Day]: DAY,
  [SpellTimeUnit.Week]: WEEK,
  [SpellTimeUnit.Month]: MONTH,
  [SpellTimeUnit.Year]: YEAR,
} as const satisfies Record<SpellTimeUnit, EffectRounds>;

/** A spell that is sustained with no limit lasts at most 10 minutes. */
const SUSTAIN_MINUTES = 10;
export const SUSTAIN_LIMIT: EffectRounds = EffectRounds.parse(SUSTAIN_MINUTES * ROUNDS_PER_UNIT[SpellTimeUnit.Minute]);

/**
 * The most rounds a spell can be kept up for, or none when it is not sustained: a time that is sustained ("sustained up
 * to 1 minute") lasts that long, and a sustained spell with no limit lasts 10 minutes. A spell that offers a sustained
 * duration among others ("1 round or sustained up to 1 minute") is taken at the sustained one.
 */
export function sustainedRounds(duration: SpellData['duration']): EffectRounds | undefined {
  if (duration?.type === SpellDurationType.Sustained) {
    return SUSTAIN_LIMIT;
  }
  if (duration?.type === SpellDurationType.Time) {
    return duration.sustained === true
      ? EffectRounds.parse(duration.count * ROUNDS_PER_UNIT[duration.unit])
      : undefined;
  }
  if (duration?.type === SpellDurationType.Either) {
    return duration.options.map((option) => sustainedRounds(option)).find((rounds) => rounds !== undefined);
  }
  return undefined;
}

/** The play edit that ends an active spell at will, which takes no action. */
export const ActiveSpellCommandField = { DismissSpell: 'dismissSpell' } as const;
export type ActiveSpellCommandField = ValueOf<typeof ActiveSpellCommandField>;

export const ActiveSpellCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ActiveSpellCommandField.DismissSpell), id: ActiveSpellId }),
]);
export type ActiveSpellCommand = z.infer<typeof ActiveSpellCommandSchema>;

/** Whether `command` ends an active spell without spending an action. */
export function isActiveSpellCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ActiveSpellCommand> {
  return command.field === ActiveSpellCommandField.DismissSpell;
}

/** `spell` with some of its fields changed. */
function activeSpellWith(
  spell: ActiveSpell,
  changes: Partial<Pick<ActiveSpell, 'remaining' | 'sustainedThisTurn'>>,
): ActiveSpell {
  return {
    id: spell.id,
    spell: spell.spell,
    rank: spell.rank,
    remaining: changes.remaining ?? spell.remaining,
    sustainedThisTurn: changes.sustainedThisTurn ?? spell.sustainedThisTurn,
  };
}

/** `spells` without the spell `id`: dismissing a spell ends it and the effects it had. */
export function withoutSpell(spells: readonly ActiveSpell[], id: ActiveSpellId): readonly ActiveSpell[] {
  return spells.filter((spell) => spell.id !== id);
}

/** `spells` after the edit `command`. */
export function applyActiveSpellCommand(
  spells: readonly ActiveSpell[],
  { id }: ActiveSpellCommand,
): readonly ActiveSpell[] {
  return withoutSpell(spells, id);
}

/** The spell `id` among `spells`, if it is active. */
export function activeSpellOf(spells: readonly ActiveSpell[], id: ActiveSpellId): ActiveSpell | undefined {
  return spells.find((spell) => spell.id === id);
}

/** `spells` with `spell` marked sustained this turn, or marked not (taking the sustain back). */
export function withSustained(
  spells: readonly ActiveSpell[],
  id: ActiveSpellId,
  sustainedThisTurn: boolean,
): readonly ActiveSpell[] {
  return spells.map((spell) => (spell.id === id ? activeSpellWith(spell, { sustainedThisTurn }) : spell));
}

/** Whether the spell can be sustained once more: it has rounds left past the next turn start. */
export function canSustain({ remaining }: ActiveSpell): boolean {
  return remaining > ONE_ROUND;
}

/** The spells End turn would end: those neither cast nor sustained since the last End turn. */
export function lapsingSpells(spells: readonly ActiveSpell[]): readonly ActiveSpell[] {
  return spells.filter((spell) => !spell.sustainedThisTurn);
}

/** `spells` after End turn: those that were not sustained are gone, and the rest must be sustained again next turn. */
export function spellsAfterTurnEnd(spells: readonly ActiveSpell[]): readonly ActiveSpell[] {
  return spells
    .filter((spell) => spell.sustainedThisTurn)
    .map((spell) => activeSpellWith(spell, { sustainedThisTurn: false }));
}

/** `spells` a round on at Start turn, and those whose rounds have run out, which are gone. */
export interface CountedSpells {
  readonly kept: readonly ActiveSpell[];
  readonly ended: readonly ActiveSpell[];
}

/** Each spell counts down a round at Start turn; one on its last round has run out. */
export function spellsCountedDown(spells: readonly ActiveSpell[]): CountedSpells {
  const ended = spells.filter(({ remaining }) => remaining <= ONE_ROUND);
  const kept = spells
    .filter(({ remaining }) => remaining > ONE_ROUND)
    .map((spell) => activeSpellWith(spell, { remaining: EffectRounds.parse(spell.remaining - ONE_ROUND) }));
  return { kept, ended };
}

/** What a spend does to the active spells: a cast adds one, a sustain keeps one up, a dismissal ends one. */
export const SpellSpendKind = { Cast: 'cast', Sustain: 'sustain', Dismiss: 'dismiss' } as const;
export type SpellSpendKind = ValueOf<typeof SpellSpendKind>;

/**
 * The active-spell change a spend records, so undoing the spend puts it back. A cast names the new spell's id, the rank it
 * was cast at and the rounds it can last (the server checks them against the spell); a sustain or dismissal names the
 * active spell.
 */
export const SpellSpendSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal(SpellSpendKind.Cast), id: ActiveSpellId, rank: SpellRank, rounds: EffectRounds }),
  z.strictObject({ kind: z.literal(SpellSpendKind.Sustain), id: ActiveSpellId }),
  z.strictObject({ kind: z.literal(SpellSpendKind.Dismiss), id: ActiveSpellId }),
]);
export type SpellSpend = z.infer<typeof SpellSpendSchema>;
