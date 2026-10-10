import { array, constant, constantFrom, integer, oneof, record, subarray, tuple, uniqueArray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { ArmorGroup, ArmorItemCategory } from '../armor';
import { Attribute } from '../attribute';
import { ConsumableCategory } from '../consumable';
import { ContentKind } from '../content-kind';
import { TreasureCategory } from '../equipment';
import { BulkWeight, Coin, MaterialGrade, UsageHands, UsageType } from '../physical-item';
import { WeaponCategory } from '../rule-element-proficiency';
import { FundamentalRune, RunedItem, RuneType } from '../rune';
import { DamageKind } from '../spell';
import { SPELL_RANK_MAX } from '../spell-rank';
import { CONTENT_LEVEL_MAX } from '../units';
import { DieSize, WeaponGroup } from '../weapon';
import {
  contentIdJson,
  damageType,
  LIST_MAX,
  positive,
  size,
  slugText,
  smallint,
  withOptional,
} from './json-arbitraries';
import { damageFormulaText } from './rich-text-arbitraries';

const RUNE_GRADE_MAX = 4;
const REINFORCING_GRADE_MAX = 6;
const COIN_COUNT_MAX = 100_000;

const runeGrade: Arbitrary<number> = integer({ min: 1, max: RUNE_GRADE_MAX });
const coinCount: Arbitrary<number> = integer({ min: 1, max: COIN_COUNT_MAX });

/** One or more coins, each given once. */
const coins: Arbitrary<object> = subarray(Object.values(Coin), { minLength: 1 }).chain((picked) =>
  record(Object.fromEntries(picked.map((coin) => [coin, coinCount]))),
);
const price: Arbitrary<object> = withOptional(record({ coins }), { per: positive });
const bulk: Arbitrary<unknown> = oneof(constantFrom(...Object.values(BulkWeight)), positive);
const material: Arbitrary<object> = withOptional(record({ type: slugText }), {
  grade: constantFrom(...Object.values(MaterialGrade)),
});

const usageHands: Arbitrary<string> = constantFrom(...Object.values(UsageHands));

/** Every usage shape: held, worn in a slot or not, affixed or the like to something, or on its own. */
const usage: Arbitrary<object> = oneof(
  record({ type: constant(UsageType.Held), hands: usageHands }),
  withOptional(constant({ type: UsageType.Worn }), { slot: slugText }),
  record({
    type: constantFrom(UsageType.Affixed, UsageType.Attached, UsageType.Applied, UsageType.Installed),
    to: slugText,
  }),
  record({ type: constantFrom(UsageType.Tattooed, UsageType.Implanted, UsageType.Carried, UsageType.Other) }),
);

/** An item's `data`: the physical fields, `required` and `optional` beside them. */
function physical(
  required: Readonly<Record<string, Arbitrary<unknown>>>,
  optional: Readonly<Record<string, Arbitrary<unknown>>> = {},
): Arbitrary<object> {
  return withOptional(record({ bulk, ...required }), {
    price,
    size,
    hardness: smallint,
    hitPoints: smallint,
    bulkPer: positive,
    material,
    ...optional,
  });
}

/** Up to a potency rune's grade in property runes; no potency rune, no property runes. */
function runesWith(secondary: string): Arbitrary<object> {
  return integer({ min: 0, max: RUNE_GRADE_MAX }).chain((potency) =>
    withOptional(
      record({
        property: uniqueArray(contentIdJson, { maxLength: potency }),
        ...(potency > 0 ? { potency: constant(potency) } : {}),
      }),
      { [secondary]: runeGrade },
    ),
  );
}

const dieSize: Arbitrary<string> = constantFrom(...Object.values(DieSize));
const weaponDamage: Arbitrary<object> = withOptional(record({ dice: positive, die: dieSize, damageType }), {
  persistent: record({ formula: damageFormulaText, damageType }),
});

const weaponData: Arbitrary<object> = physical(
  { category: constantFrom(...Object.values(WeaponCategory)), damage: weaponDamage, usage },
  {
    group: constantFrom(...Object.values(WeaponGroup)),
    baseItem: slugText,
    splash: positive,
    itemBonus: integer({ min: 1, max: RUNE_GRADE_MAX }),
    range: smallint,
    reload: smallint,
    ammunition: withOptional(record({ type: slugText }), { capacity: positive }),
    runes: runesWith('striking'),
  },
);

const armorData: Arbitrary<object> = physical(
  { category: constantFrom(...Object.values(ArmorItemCategory)), acBonus: smallint },
  {
    group: constantFrom(...Object.values(ArmorGroup)),
    baseItem: slugText,
    dexCap: smallint,
    checkPenalty: positive,
    speedPenalty: smallint,
    strength: integer({ min: 0, max: RUNE_GRADE_MAX }),
    runes: runesWith('resilient'),
  },
);

const shieldData: Arbitrary<object> = physical(
  { acBonus: smallint, hardness: smallint, hitPoints: smallint },
  {
    baseItem: slugText,
    speedPenalty: smallint,
    runes: record({ reinforcing: integer({ min: 1, max: REINFORCING_GRADE_MAX }) }),
  },
);

const equipmentData: Arbitrary<object> = physical(
  {},
  {
    usage,
    container: withOptional(record({ capacity: positive }), { ignored: positive }),
    apex: constantFrom(...Object.values(Attribute)),
  },
);

const NOT_AMMUNITION = Object.values(ConsumableCategory).filter(
  (category) => category !== ConsumableCategory.Ammunition,
);
const consumableUse = {
  uses: positive,
  damage: record({ formula: damageFormulaText, damageType, kind: constantFrom(...Object.values(DamageKind)) }),
  spell: record({ spell: contentIdJson, rank: integer({ min: 1, max: SPELL_RANK_MAX }) }),
  usage,
};

/** Only ammunition names the ammunition it can be fired as. */
const consumableData: Arbitrary<object> = oneof(
  physical({ category: constantFrom(...NOT_AMMUNITION) }, consumableUse),
  physical(
    { category: constant(ConsumableCategory.Ammunition) },
    { ...consumableUse, ammunition: uniqueArray(slugText, { minLength: 1, maxLength: LIST_MAX }) },
  ),
);

const etchedOnto = (items: readonly string[]): Arbitrary<object> =>
  withOptional(record({ item: constantFrom(...items) }), { restriction: slugText });

/** The items each fundamental rune goes on, and its highest grade. */
const FUNDAMENTALS: readonly (readonly [string, readonly string[], number])[] = [
  [FundamentalRune.Potency, [RunedItem.Weapon, RunedItem.Armor], RUNE_GRADE_MAX],
  [FundamentalRune.Striking, [RunedItem.Weapon], RUNE_GRADE_MAX],
  [FundamentalRune.Resilient, [RunedItem.Armor], RUNE_GRADE_MAX],
  [FundamentalRune.Reinforcing, [RunedItem.Shield], REINFORCING_GRADE_MAX],
];

const fundamentalRune: Arbitrary<object> = constantFrom(...FUNDAMENTALS).chain(([rune, items, max]) =>
  physical({
    type: constant(RuneType.Fundamental),
    rune: constant(rune),
    grade: integer({ min: 1, max }),
    etchedOnto: etchedOnto(items),
  }),
);

const anyRunedItem: Arbitrary<object> = etchedOnto(Object.values(RunedItem));
const propertyRune: Arbitrary<object> = physical({ type: constant(RuneType.Property), etchedOnto: anyRunedItem });

const runeData: Arbitrary<object> = oneof(fundamentalRune, propertyRune);

const treasureData: Arbitrary<object> = physical({}, { category: constantFrom(...Object.values(TreasureCategory)) });

const kitItem: Arbitrary<object> = record({ item: contentIdJson, quantity: positive });
/** A kit item, holding others when it is a container. */
function kitEntryOf([item, contents]: readonly [object, object[]]): Arbitrary<object> {
  return withOptional(constant(item), { contents: constant(contents) });
}
const kitEntry: Arbitrary<object> = tuple(kitItem, array(kitItem, { maxLength: LIST_MAX })).chain(kitEntryOf);

const kitData: Arbitrary<object> = withOptional(
  record({ items: array(kitEntry, { minLength: 1, maxLength: LIST_MAX }) }),
  { price },
);

const itemLevel: Arbitrary<number> = integer({ min: 0, max: CONTENT_LEVEL_MAX });

/** Valid `data` for each equipment kind, with the level an item always has; a kit has none. */
export const EQUIPMENT_KIND_ARBITRARIES = {
  [ContentKind.Armor]: { data: armorData, level: itemLevel },
  [ContentKind.Consumable]: { data: consumableData, level: itemLevel },
  [ContentKind.Equipment]: { data: equipmentData, level: itemLevel },
  [ContentKind.Kit]: { data: kitData },
  [ContentKind.Rune]: { data: runeData, level: itemLevel },
  [ContentKind.Shield]: { data: shieldData, level: itemLevel },
  [ContentKind.Treasure]: { data: treasureData, level: itemLevel },
  [ContentKind.Weapon]: { data: weaponData, level: itemLevel },
} as const;
