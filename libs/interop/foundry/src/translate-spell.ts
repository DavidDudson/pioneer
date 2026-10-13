import * as z from 'zod';

import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';
import { FoundryRitual, primaryCheckOf, secondaryChecksOf } from './ritual-checks';
import { castTimeOf } from './spell-casting-text';
import { damageParts, FoundryDamage, FoundryHeightening, heighteningOf, partKeys } from './spell-damage';
import {
  defenseOf,
  FIELD_MAX,
  FoundryArea,
  FoundryDefense,
  FoundryDuration,
  FoundryText,
  reachOf,
  TEXT_MAX,
} from './spell-reach';
import { rankChanges, variantsOf } from './spell-variants';
import { plainWords } from './translate-action';

/**
 * A spell's or ritual's `data` from Foundry's `spell` item (a ritual is one with ritual data). Foundry stores casting
 * time, range, targets and duration as English, which map when their whole wording does (ADR-0021); a wording that
 * does not is reported and the field left out, except a casting time, without which there is no data. Areas,
 * defences, traditions, damage and heightening are structured in Foundry too and carry over.
 */

/** `system` fields a spell and a ritual both read. */
const CASTING_FIELDS = ['area', 'cost', 'defense', 'duration', 'range', 'requirements', 'target', 'time'];

export const SPELL_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  ...CASTING_FIELDS,
  'counteraction',
  'damage',
  'heightening',
  'overlays',
]);

export const RITUAL_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, ...CASTING_FIELDS, 'ritual']);

const LIST_MAX = 8;

const Traditions = z.array(z.string().max(FIELD_MAX)).max(LIST_MAX).default([]);

const FoundrySpellSystem = z.looseObject({
  level: z.looseObject({ value: z.number() }),
  time: FoundryText,
  range: FoundryText.nullish(),
  target: FoundryText.nullish(),
  area: FoundryArea.nullish(),
  duration: FoundryDuration.nullish(),
  defense: FoundryDefense.nullish(),
  cost: FoundryText.nullish(),
  requirements: z.string().max(TEXT_MAX).nullish(),
  traits: z.looseObject({ traditions: Traditions }).optional(),
  damage: FoundryDamage.default({}),
  overlays: z.unknown().optional(),
  heightening: FoundryHeightening.nullish(),
  counteraction: z.boolean().default(false),
  ritual: FoundryRitual.nullish(),
});
type FoundrySpellSystem = z.infer<typeof FoundrySpellSystem>;

/** What casting takes; undefined when the casting time does not map. */
function castingOf(system: FoundrySpellSystem, log: GapLog): object | undefined {
  const time = castTimeOf(system.time.value);
  if (time === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'time.value', raw: system.time.value });
    return undefined;
  }
  return {
    rank: system.level.value,
    time,
    ...reachOf(system, '', log),
    ...setFields({
      defense: system.defense ? defenseOf(system.defense, log) : undefined,
      cost: system.cost ? plainWords('cost.value', system.cost.value.trim(), log) : undefined,
      requirements: plainWords('requirements', (system.requirements ?? '').trim(), log),
    }),
  };
}

/** A spell's data, unparsed; undefined when its `system` is not shaped as a spell's or its casting time does not map. */
export function spellData(input: KindInput): object | undefined {
  const { log } = input;
  const system = systemOf(FoundrySpellSystem, input);
  const casting = system && castingOf(system, log);
  if (system === undefined || casting === undefined) {
    return undefined;
  }
  const damage = damageParts(system.damage, { field: 'damage' }, log);
  const changesOf = rankChanges(system.damage, log);
  const { heightening } = system;
  return {
    ...casting,
    traditions: system.traits?.traditions ?? [],
    damage,
    ...setFields({
      heightening: heightening ? heighteningOf({ heightening, kept: partKeys(damage), changesOf, log }) : undefined,
      variants: variantsOf(system.overlays, { ...system, kept: partKeys(damage) }, log),
      counteraction: system.counteraction ? true : undefined,
    }),
  };
}

/** A ritual's data, unparsed; undefined when its casting time or checks do not map. */
export function ritualData(input: KindInput): object | undefined {
  const { log } = input;
  const system = systemOf(FoundrySpellSystem, input);
  const casting = system && castingOf(system, log);
  const ritual = system?.ritual;
  const checks = ritual ? ritualChecks(ritual, log) : undefined;
  return casting && checks && { ...casting, ...checks };
}

/** A ritual's primary and secondary checks; undefined, and reported, when either does not map. */
function ritualChecks({ primary, secondary }: FoundryRitual, log: GapLog): object | undefined {
  const check = primaryCheckOf(primary.check);
  const checks = secondaryChecksOf(secondary.checks);
  if (check === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'ritual.primary.check', raw: primary.check });
  }
  if (checks === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'ritual.secondary.checks', raw: secondary.checks });
  }
  return check && checks && { primary: check, secondary: { checks, casters: secondary.casters } };
}
