import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { DamageTypeSchema } from './damage';
import { DamageFormula } from './damage-formula';
import { RulesMessage } from './messages';
import { DamageCategorySchema } from './rich-text';
import { castingFields, SpellArea, SpellDuration, SpellRange, SpellTargets } from './spell-casting';
import { SPELL_RANK_MAX, SpellRank } from './spell-rank';
import { MagicTraditionSchema } from './spellcasting-tradition';
import { uniqueItems } from './unique-items';
import { Feet } from './units';

/** Whether a damage part harms, heals, or both (Heal on the living and the undead). */
export const DamageKind = { Damage: 'damage', Healing: 'healing' } as const;
export type DamageKind = ValueOf<typeof DamageKind>;

const DAMAGE_KINDS = Object.keys(DamageKind).length;
const DAMAGE_PARTS_MAX = 8;

/** Names a damage part so heightening can add to it (Foundry pf2e's damage record key, `0`). */
const DamagePartKey = Slug.brand<'DamagePartKey'>();
type DamagePartKey = z.infer<typeof DamagePartKey>;

/** One part of a spell's damage ("6d6 fire"). */
const SpellDamage = z.strictObject({
  key: DamagePartKey,
  formula: DamageFormula,
  damageType: DamageTypeSchema,
  category: DamageCategorySchema.optional(),
  kinds: z.array(z.enum(DamageKind)).min(1).max(DAMAGE_KINDS).readonly().check(uniqueItems),
});
type SpellDamage = z.infer<typeof SpellDamage>;

/** A spell's damage parts, each key once. */
const SpellDamageParts = z
  .array(SpellDamage)
  .max(DAMAGE_PARTS_MAX)
  .readonly()
  .check((context) => {
    const seen = new Set<DamagePartKey>();
    for (const [index, { key }] of context.value.entries()) {
      if (seen.has(key)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'key'],
          ...issueParams(message(RulesMessage.ListDuplicate, { value: key })),
        });
      }
      seen.add(key);
    }
  });

/** What one heightening step adds to a damage part ("+2d6"). */
const DamageIncrease = z.strictObject({ key: DamagePartKey, formula: DamageFormula });

export const HeighteningType = { Interval: 'interval', Fixed: 'fixed' } as const;
export type HeighteningType = ValueOf<typeof HeighteningType>;

/** How many ranks one heightening step spans: "Heightened (+2)" is 2. */
const RankStep = Pg.smallint()
  .min(1)
  .max(SPELL_RANK_MAX - 1)
  .brand<'RankStep'>();

/** "Heightened (+1) The damage increases by 2d6": what each `interval` ranks above the spell's adds. */
const IntervalHeightening = z.strictObject({
  type: z.literal(HeighteningType.Interval),
  interval: RankStep,
  damage: z.array(DamageIncrease).max(DAMAGE_PARTS_MAX).readonly(),
  /** Feet the area grows by each step. */
  area: Feet.optional(),
});

/** "Heightened (4th)": what the spell has instead at that rank and above. */
const HeightenedRank = z.strictObject({
  rank: SpellRank,
  damage: SpellDamageParts.optional(),
  range: SpellRange.optional(),
  area: SpellArea.optional(),
  targets: SpellTargets.optional(),
  duration: SpellDuration.optional(),
});

const FixedHeightening = z.strictObject({
  type: z.literal(HeighteningType.Fixed),
  ranks: z
    .array(HeightenedRank)
    .min(1)
    .max(SPELL_RANK_MAX - 1)
    .readonly(),
});

const Heightening = z.discriminatedUnion('type', [IntervalHeightening, FixedHeightening]);
type Heightening = z.infer<typeof Heightening>;

const TRADITIONS_MAX = 4;

type SpellCheck = z.core.ParsePayload<{
  readonly rank: SpellRank;
  readonly damage: readonly SpellDamage[];
  readonly heightening?: Heightening | undefined;
}>;

function pushIssue(context: SpellCheck, path: readonly PropertyKey[], descriptor: MessageDescriptor): void {
  context.issues.push({ code: 'custom', input: context.value, path: [...path], ...issueParams(descriptor) });
}

/** Interval heightening adds to damage parts the spell has. */
function checkIncreases(context: SpellCheck): void {
  const { damage, heightening } = context.value;
  if (heightening?.type !== HeighteningType.Interval) {
    return;
  }
  const keys = new Set(damage.map(({ key }) => key));
  for (const [index, { key }] of heightening.damage.entries()) {
    if (!keys.has(key)) {
      pushIssue(context, ['heightening', 'damage', index, 'key'], message(RulesMessage.SpellDamageKey, { key }));
    }
  }
}

/** Fixed heightening names each rank once, above the spell's own. */
function checkHeightenedRanks(context: SpellCheck): void {
  const { rank, heightening } = context.value;
  if (heightening?.type !== HeighteningType.Fixed) {
    return;
  }
  const seen = new Set<SpellRank>();
  for (const [index, heightened] of heightening.ranks.entries()) {
    const path = ['heightening', 'ranks', index, 'rank'];
    if (heightened.rank <= rank) {
      pushIssue(context, path, message(RulesMessage.SpellHeightenAbove, { rank }));
    } else if (seen.has(heightened.rank)) {
      pushIssue(context, path, message(RulesMessage.ListDuplicate, { value: heightened.rank }));
    }
    seen.add(heightened.rank);
  }
}

/**
 * A spell's `data` on the `ContentEntry` envelope, cantrips and focus spells included: they are spells with the
 * `cantrip` or `focus` trait, as in Foundry pf2e. What it does beyond its damage is its description, and the effects
 * it applies are `effect` entries.
 */
export const SpellData = z
  .strictObject({
    ...castingFields,
    traditions: z.array(MagicTraditionSchema).max(TRADITIONS_MAX).readonly().check(uniqueItems),
    damage: SpellDamageParts,
    heightening: Heightening.optional(),
    /** It counteracts (Dispel Magic). */
    counteraction: z.boolean().optional(),
  })
  .check((context) => {
    checkIncreases(context);
    checkHeightenedRanks(context);
  });
export type SpellData = z.infer<typeof SpellData>;
