import { DefenceStatusKind, EngineMessage, RuleId } from '@pioneer/rules/engine';
import type { AdjustmentLine, Defences, DefenceStatus, ImmunityLine } from '@pioneer/rules/engine';
import { Negated, PredicateMessage, SummaryKind } from '@pioneer/rules/predicate';
import {
  ContentId,
  contentId,
  ContentText,
  DamageAmount,
  DamageException,
  EntrySlug,
  Immunity,
  Origin,
  PackId,
  Predicate,
} from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

const PLAYER_CORE = PackId.parse('player-core');

export const FIRE_RING = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('equipment:fire-resistance-ring')));
export const RAGE = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('action:rage')));
export const DWARF = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('ancestry:dwarf')));
export const GOLEM_FORM = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('spell:golem-form')));
export const ADAMANTINE = DamageException.parse('adamantine');
export const SLEEP = Immunity.parse('sleep');

/** Display names for the fixtures' entries, as a container resolves them from the registry. */
export const ENTRY_NAMES: ReadonlyMap<ContentId, string> = new Map([
  [FIRE_RING, 'Fire Resistance Ring'],
  [RAGE, 'Rage'],
  [DWARF, 'Dwarf'],
  [GOLEM_FORM, 'Golem Form'],
]);

const APPLIED: DefenceStatus = { kind: DefenceStatusKind.Applied };

/** Conditional on an authored summary, as `display.summary` gives one. */
export const WHILE_RAGING: DefenceStatus = {
  kind: DefenceStatusKind.Conditional,
  when: Predicate.parse(['self:effect:rage']),
  summary: { kind: SummaryKind.Authored, text: ContentText.parse('you are raging') },
};

/** Conditional on a generated phrase. */
export const IN_DARKNESS: DefenceStatus = {
  kind: DefenceStatusKind.Conditional,
  when: Predicate.parse(['lighting:darkness']),
  summary: {
    kind: SummaryKind.Phrase,
    message: message(PredicateMessage.Lighting, { negated: Negated.No, name: 'darkness' }),
  },
};

function origin(entry: ContentId): Origin {
  return Origin.parse({ hops: [], entry, sources: [{ kind: 'book', book: 'player-core', page: 1 }] });
}

export function immunity(entry: ContentId, type: string, status: DefenceStatus = APPLIED): ImmunityLine {
  return {
    id: RuleId.parse(`${entry}#0`),
    label: { entry },
    origin: origin(entry),
    type: Immunity.parse(type),
    status,
  };
}

interface AdjustmentOptions {
  /** Left out for a failed line. */
  readonly value?: number;
  readonly exceptions?: readonly string[];
  readonly status?: DefenceStatus;
}

export function adjustment(
  entry: ContentId,
  type: DamageAdjustmentTarget,
  { value, exceptions = [], status = APPLIED }: AdjustmentOptions = {},
): AdjustmentLine {
  return {
    id: RuleId.parse(`${entry}#0`),
    label: { entry },
    origin: origin(entry),
    type,
    value: value === undefined ? undefined : DamageAmount.parse(value),
    exceptions: exceptions.map((exception) => DamageException.parse(exception)),
    status,
  };
}

/** A failed line: its value past `DamageAmount`'s bound. */
export const OUT_OF_RANGE: DefenceStatus = {
  kind: DefenceStatusKind.Failed,
  error: message(EngineMessage.DefenceOutOfRange, { maximum: 32_767 }),
  position: undefined,
  when: undefined,
};

const GOLEM_COLD = 5;
const RING_FIRE = 10;
const DWARF_FIRE = 5;
const RAGE_PHYSICAL = 3;

export const NO_DEFENCES: Defences = { immunities: [], weaknesses: [], resistances: [] };

/** A barbarian in a fire resistance ring: one of each list, a group, an exception, conditional and superseded. */
export const BARBARIAN_DEFENCES: Defences = {
  immunities: [immunity(GOLEM_FORM, 'fire'), immunity(GOLEM_FORM, 'sleep')],
  weaknesses: [adjustment(GOLEM_FORM, 'cold', { value: GOLEM_COLD, exceptions: ['magical'] })],
  resistances: [
    adjustment(FIRE_RING, 'fire', { value: RING_FIRE }),
    adjustment(DWARF, 'fire', {
      value: DWARF_FIRE,
      status: { kind: DefenceStatusKind.Superseded, by: RuleId.parse(`${FIRE_RING}#0`) },
    }),
    adjustment(RAGE, 'physical', { value: RAGE_PHYSICAL, exceptions: ['adamantine'], status: WHILE_RAGING }),
  ],
};

const FORM_FIRE = 10;

/** A dwarf in Golem Form: the form's immunity and fire resistance, which beats the dwarf's own and supersedes it. */
export const FORM_DEFENCES: Defences = {
  immunities: [{ ...immunity(GOLEM_FORM, 'poison'), fromForm: true }],
  weaknesses: [],
  resistances: [
    { ...adjustment(GOLEM_FORM, 'fire', { value: FORM_FIRE }), fromForm: true },
    adjustment(DWARF, 'fire', {
      value: DWARF_FIRE,
      status: { kind: DefenceStatusKind.Superseded, by: RuleId.parse(`${GOLEM_FORM}#0`) },
    }),
  ],
};
