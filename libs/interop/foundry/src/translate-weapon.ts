import * as z from 'zod';

import { FoundryRunes, itemRunes } from './item-runes';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';
import { FoundryPhysicalSystem, PHYSICAL_FIELDS, physicalData, usageField } from './physical-fields';

/**
 * A weapon's `data` from Foundry's `weapon` item, alchemical bombs included: category, group, base weapon, damage
 * with a bomb's persistent and splash damage, the ranged fields, and a specific weapon's runes. Foundry's `specific`
 * repeats the runes and material the item already has, so it is read through them.
 */

export const WEAPON_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  ...PHYSICAL_FIELDS,
  'usage',
  'baseItem',
  'category',
  'group',
  'damage',
  'splashDamage',
  'bonus',
  'bonusDamage',
  'range',
  'reload',
  'ammo',
  'expend',
  'grade',
  'runes',
  'specific',
]);

const FIELD_MAX = 64;

const FoundryPersistent = z.looseObject({
  number: z.number(),
  faces: z.number().nullish(),
  type: z.string().max(FIELD_MAX),
});

const FoundryWeaponDamage = z.looseObject({
  dice: z.number(),
  die: z.string().max(FIELD_MAX).nullish(),
  damageType: z.string().max(FIELD_MAX),
  persistent: FoundryPersistent.nullish(),
});
type FoundryWeaponDamage = z.infer<typeof FoundryWeaponDamage>;

const FoundryValue = z.looseObject({ value: z.number().nullish() }).nullish();

const FoundryWeaponSystem = FoundryPhysicalSystem.extend({
  category: z.string().max(FIELD_MAX),
  group: z.string().max(FIELD_MAX).nullish(),
  baseItem: z.string().max(FIELD_MAX).nullish(),
  damage: FoundryWeaponDamage,
  splashDamage: FoundryValue,
  bonus: FoundryValue,
  bonusDamage: FoundryValue,
  range: z.number().nullish(),
  reload: z.looseObject({ value: z.string().max(FIELD_MAX).nullish() }).nullish(),
  ammo: z
    .looseObject({
      baseType: z.string().max(FIELD_MAX).nullish(),
      builtIn: z.boolean().nullish(),
      capacity: z.number().nullish(),
    })
    .nullish(),
  expend: z.number().nullish(),
  grade: z.string().max(FIELD_MAX).nullish(),
  runes: FoundryRunes.nullish(),
});
type FoundryWeaponSystem = z.infer<typeof FoundryWeaponSystem>;

/** "1d8 slashing"; with no die (Foundry's empty `die`), `dice` is flat damage; persistent damage as a formula. */
function damageOf({ dice, die, damageType, persistent }: FoundryWeaponDamage): object {
  const formula =
    persistent === null || persistent === undefined
      ? undefined
      : `${persistent.number}${(persistent.faces ?? 0) > 0 ? `d${persistent.faces}` : ''}`;
  return {
    dice,
    damageType,
    ...setFields({
      die: die === '' || die === null ? undefined : die,
      persistent: formula === undefined ? undefined : { formula, damageType: persistent?.type },
    }),
  };
}

/** Foundry's no-reload markers: melee and thrown weapons. */
const NO_RELOAD: ReadonlySet<string> = new Set(['', '-']);

/** The actions to reload, when Foundry gives a number; anything else is reported. */
function reloadOf(reload: string | null | undefined, log: GapLog): number | undefined {
  if (reload === null || reload === undefined || NO_RELOAD.has(reload)) {
    return undefined;
  }
  const actions = Number(reload);
  if (!Number.isInteger(actions)) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'reload.value', raw: reload });
    return undefined;
  }
  return actions;
}

/** What a ranged weapon fires: its type, built-in ammunition and capacity; none for a weapon without `ammo`. */
function ammunitionOf(ammo: FoundryWeaponSystem['ammo']): object | undefined {
  if (ammo === null || ammo === undefined) {
    return undefined;
  }
  return setFields({
    type: ammo.baseType ?? undefined,
    builtIn: ammo.builtIn === true ? true : undefined,
    capacity: (ammo.capacity ?? 0) > 0 ? ammo.capacity : undefined,
  });
}

/**
 * A bomb's attack bonus. Foundry also writes a specific weapon's potency there; one that matches it says nothing,
 * and one that differs from a potency rune is reported.
 */
function itemBonusOf({ bonus, runes }: FoundryWeaponSystem, log: GapLog): number | undefined {
  const value = bonus?.value ?? 0;
  const potency = runes?.potency ?? 0;
  if (value <= 0 || value === potency) {
    return undefined;
  }
  if (potency > 0) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'bonus.value', raw: value });
    return undefined;
  }
  return value;
}

/** Foundry's default ammunition spent per shot. */
const EXPEND_ONE = 1;

/** Fields Pioneer has no place for, reported when set to more than Foundry's default. */
function reportExtras({ bonusDamage, expend, grade }: FoundryWeaponSystem, log: GapLog): void {
  if ((bonusDamage?.value ?? 0) !== 0) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: 'bonusDamage', raw: bonusDamage });
  }
  if (expend !== null && expend !== undefined && expend !== EXPEND_ONE) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: 'expend', raw: expend });
  }
  if (grade !== null && grade !== undefined) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: 'grade', raw: grade });
  }
}

/** The weapon's data, unparsed; undefined when its `system` is not shaped as a weapon's or its Bulk does not map. */
export function weaponData(input: KindInput): object | undefined {
  const system = systemOf(FoundryWeaponSystem, input);
  const physical = system && physicalData(system, input);
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  const { log } = input;
  reportExtras(system, log);
  return {
    ...physical,
    category: system.category,
    damage: damageOf(system.damage),
    ...usageField(system, log),
    ...setFields({
      group: system.group ?? undefined,
      baseItem: system.baseItem ?? undefined,
      splash: (system.splashDamage?.value ?? 0) > 0 ? system.splashDamage?.value : undefined,
      itemBonus: itemBonusOf(system, log),
      range: system.range ?? undefined,
      reload: reloadOf(system.reload?.value, log),
      ammunition: ammunitionOf(system.ammo),
      runes: system.runes ? itemRunes(system.runes, ['potency', 'striking'], input) : undefined,
    }),
  };
}
