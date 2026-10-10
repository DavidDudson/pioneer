import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, Slug } from './content-id';
import { RulesMessage } from './messages';
import { physicalFields } from './physical-item';
import { uniqueItems } from './unique-items';

/** The grade of a potency, striking or resilient rune: +1 to +4, striking to mythic striking. */
const RUNE_GRADE_MAX = 4;
export const RuneGrade = Pg.smallint().min(1).max(RUNE_GRADE_MAX).brand<'RuneGrade'>();
export type RuneGrade = z.infer<typeof RuneGrade>;

/** The grade of a reinforcing rune, minor to supreme. */
const REINFORCING_GRADE_MAX = 6;
export const ReinforcingGrade = Pg.smallint().min(1).max(REINFORCING_GRADE_MAX).brand<'ReinforcingGrade'>();
export type ReinforcingGrade = z.infer<typeof ReinforcingGrade>;

/** A specific item's property runes, as `rune` entries; a potency rune holds one per grade. */
export const PropertyRunes = z.array(ContentId).max(RUNE_GRADE_MAX).readonly().check(uniqueItems);

type PropertyRuneCheck = z.core.ParsePayload<{
  readonly potency?: RuneGrade | undefined;
  readonly property: readonly ContentId[];
}>;

/** An item has no more property runes than its potency rune's grade. */
export function checkPropertyRunes(context: PropertyRuneCheck): void {
  const { potency = 0, property } = context.value;
  if (property.length > potency) {
    context.issues.push({
      code: 'custom',
      input: context.value,
      path: ['property'],
      ...issueParams(message(RulesMessage.RunePropertySlots, { potency })),
    });
  }
}

export const RuneType = { Fundamental: 'fundamental', Property: 'property' } as const;
export type RuneType = ValueOf<typeof RuneType>;

/** The fundamental runes, as Foundry pf2e names them. */
export const FundamentalRune = {
  Potency: 'potency',
  Striking: 'striking',
  Resilient: 'resilient',
  Reinforcing: 'reinforcing',
} as const;
export type FundamentalRune = ValueOf<typeof FundamentalRune>;

/** What a rune is etched onto. */
export const RunedItem = { Weapon: 'weapon', Armor: 'armor', Shield: 'shield' } as const;
export type RunedItem = ValueOf<typeof RunedItem>;

/** What narrows the items a rune goes on (`melee`, `metal`, `clan-dagger`), from Foundry pf2e's usage. */
const EtchingRestriction = Slug.brand<'EtchingRestriction'>();

/** "Etched onto a melee weapon": the item, and what narrows it. */
const EtchedOnto = z.strictObject({ item: z.enum(RunedItem), restriction: EtchingRestriction.optional() });

/** The items each fundamental rune goes on: weapon and armour potency are separate runes. */
const FUNDAMENTAL_ITEMS: Readonly<Record<FundamentalRune, readonly RunedItem[]>> = {
  [FundamentalRune.Potency]: [RunedItem.Weapon, RunedItem.Armor],
  [FundamentalRune.Striking]: [RunedItem.Weapon],
  [FundamentalRune.Resilient]: [RunedItem.Armor],
  [FundamentalRune.Reinforcing]: [RunedItem.Shield],
};

/** The grade of a fundamental rune: a reinforcing rune goes to 6, the rest to 4. */
const FundamentalGrade = Pg.smallint().min(1).max(REINFORCING_GRADE_MAX).brand<'FundamentalGrade'>();

/** "+2 weapon potency", "greater striking", "minor reinforcing". */
const FundamentalRuneData = z
  .strictObject({
    ...physicalFields,
    type: z.literal(RuneType.Fundamental),
    rune: z.enum(FundamentalRune),
    grade: FundamentalGrade,
    etchedOnto: EtchedOnto,
  })
  .check((context) => {
    const { rune, grade, etchedOnto } = context.value;
    if (!FUNDAMENTAL_ITEMS[rune].includes(etchedOnto.item)) {
      context.issues.push({
        code: 'custom',
        input: context.value,
        path: ['etchedOnto', 'item'],
        ...issueParams(message(RulesMessage.RuneEtchedOnto, { rune, item: etchedOnto.item })),
      });
    }
    if (rune !== FundamentalRune.Reinforcing && grade > RUNE_GRADE_MAX) {
      context.issues.push({
        code: 'custom',
        input: context.value,
        path: ['grade'],
        ...issueParams(message(RulesMessage.RuneGrade, { rune, max: RUNE_GRADE_MAX })),
      });
    }
  });

/** "Flaming": what it does is its `rules`. */
const PropertyRuneData = z.strictObject({
  ...physicalFields,
  type: z.literal(RuneType.Property),
  etchedOnto: EtchedOnto,
});

/**
 * A rune's `data` on the `ContentEntry` envelope: fundamental or property, and what it is etched onto. Foundry pf2e
 * stores a rune as equipment with an `etched-onto-…` usage, and keeps what property runes do in code; here that is
 * the rune's `rules`.
 */
export const RuneData = z.discriminatedUnion('type', [FundamentalRuneData, PropertyRuneData]);
export type RuneData = z.infer<typeof RuneData>;
