import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { ContentText } from './content-text';
import { DamageTypeSchema } from './damage';
import { DamageFormula, SpellDamageFormula } from './damage-formula';
import { FormEffects } from './form-effects';
import { RulesMessage } from './messages';
import { DamageCategorySchema, RichText } from './rich-text';
import { castingFields, CastTime, SpellArea, SpellDefense, SpellDuration, SpellRange } from './spell-casting';
import { SPELL_RANK_MAX, SpellRank } from './spell-rank';
import { SpellTargets } from './spell-targets';
import { MagicTraditionSchema } from './spellcasting-tradition';
import { DamageException, Trait } from './trait';
import { uniqueItems } from './unique-items';
import { Feet } from './units';

/** Whether a damage part harms, heals, or both (Heal on the living and the undead). */
export const DamageKind = { Damage: 'damage', Healing: 'healing' } as const;
export type DamageKind = ValueOf<typeof DamageKind>;

const DAMAGE_KINDS = Object.keys(DamageKind).length;
const DAMAGE_PARTS_MAX = 8;
const MATERIALS_MAX = 4;

/** Names a damage part so heightening can add to it (Foundry pf2e's damage record key, `0`). */
const DamagePartKey = Slug.brand<'DamagePartKey'>();
type DamagePartKey = z.infer<typeof DamagePartKey>;

/**
 * One part of a spell's damage ("6d6 fire"). With no `damageType` it is untyped (Disintegrate's damage, Breath of
 * Life's healing), not a type the caster chooses. Its formula may add the caster's spellcasting attribute modifier (`@spellcasting.attr`).
 */
const SpellDamage = z.strictObject({
  key: DamagePartKey,
  formula: SpellDamageFormula,
  damageType: DamageTypeSchema.optional(),
  category: DamageCategorySchema.optional(),
  kinds: z.array(z.enum(DamageKind)).min(1).max(DAMAGE_KINDS).readonly().check(uniqueItems),
  /** The materials the damage counts as (Moonbeam's silver), for weaknesses and resistances that name one. */
  materials: z.array(DamageException).min(1).max(MATERIALS_MAX).readonly().check(uniqueItems).optional(),
});
export type SpellDamage = z.infer<typeof SpellDamage>;

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

const TRAITS_MAX = 16;

/**
 * "Heightened (4th)": what the spell has instead at that rank and above. `traits` is the spell's whole list of traits
 * then, as Foundry writes it.
 */
const HeightenedRank = z
  .strictObject({
    rank: SpellRank,
    time: CastTime.optional(),
    traits: z.array(Trait).max(TRAITS_MAX).readonly().check(uniqueItems).optional(),
    damage: SpellDamageParts.optional(),
    range: SpellRange.optional(),
    area: SpellArea.optional(),
    targets: SpellTargets.optional(),
    duration: SpellDuration.optional(),
  })
  .refine(({ rank: _rank, ...changes }) => Object.values(changes).some((change) => change !== undefined), {
    ...issueParams(message(RulesMessage.SpellHeightenEmpty)),
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
export type Heightening = z.infer<typeof Heightening>;

const TRADITIONS_MAX = 4;
const VARIANTS_MAX = 8;

/**
 * One way to cast a spell (Heal's one-, two- and three-action versions, Gouging Claw's slashing or piercing), as
 * Foundry's `override` overlays: what it has instead of the spell's own, the rest as the spell has it. `damage` is
 * the variant's whole list of parts and `heightening` its whole heightening, the spell's laid under the overlay's.
 */
const SpellVariant = z
  .strictObject({
    name: ContentText.optional(),
    time: CastTime.optional(),
    range: SpellRange.optional(),
    area: SpellArea.optional(),
    targets: SpellTargets.optional(),
    duration: SpellDuration.optional(),
    defense: SpellDefense.optional(),
    damage: SpellDamageParts.optional(),
    heightening: Heightening.optional(),
  })
  .refine(({ name: _name, ...changes }) => Object.values(changes).some((change) => change !== undefined), {
    ...issueParams(message(RulesMessage.SpellVariantEmpty)),
  });
export type SpellVariant = z.infer<typeof SpellVariant>;

type SpellCheck = z.core.ParsePayload<{
  readonly rank: SpellRank;
  readonly damage: readonly SpellDamage[];
  readonly heightening?: Heightening | undefined;
  readonly variants?: readonly SpellVariant[] | undefined;
  readonly dismiss?: true | undefined;
  readonly dismissNote?: RichText | undefined;
}>;

function pushIssue(context: SpellCheck, path: readonly PropertyKey[], descriptor: MessageDescriptor): void {
  context.issues.push({ code: 'custom', input: context.value, path: [...path], ...issueParams(descriptor) });
}

/** The heightening at `path`, and the damage parts it adds to. */
interface Increases {
  readonly path: readonly PropertyKey[];
  readonly heightening: Heightening | undefined;
  readonly damage: readonly SpellDamage[];
}

/** Interval heightening adds to damage parts in `damage`. */
function checkIncreasesAt(context: SpellCheck, { path, heightening, damage }: Increases): void {
  if (heightening?.type !== HeighteningType.Interval) {
    return;
  }
  const keys = new Set(damage.map(({ key }) => key));
  for (const [index, { key }] of heightening.damage.entries()) {
    if (!keys.has(key)) {
      pushIssue(context, [...path, 'damage', index, 'key'], message(RulesMessage.SpellDamageKey, { key }));
    }
  }
}

/** Interval heightening adds to damage parts the spell, or the variant it heightens, has. */
function checkIncreases(context: SpellCheck): void {
  const { damage, heightening, variants = [] } = context.value;
  checkIncreasesAt(context, { path: ['heightening'], heightening, damage });
  for (const [index, variant] of variants.entries()) {
    const path = ['variants', index, 'heightening'];
    checkIncreasesAt(context, { path, heightening: variant.heightening, damage: variant.damage ?? damage });
  }
}

/** Fixed heightening at `path` names each rank once, above the spell's own. */
function checkRanksAt(context: SpellCheck, path: readonly PropertyKey[], heightening: Heightening | undefined): void {
  const { rank } = context.value;
  if (heightening?.type !== HeighteningType.Fixed) {
    return;
  }
  const seen = new Set<SpellRank>();
  for (const [index, heightened] of heightening.ranks.entries()) {
    const at = [...path, 'ranks', index, 'rank'];
    if (heightened.rank <= rank) {
      pushIssue(context, at, message(RulesMessage.SpellHeightenAbove, { rank }));
    } else if (seen.has(heightened.rank)) {
      pushIssue(context, at, message(RulesMessage.ListDuplicate, { value: heightened.rank }));
    }
    seen.add(heightened.rank);
  }
}

/** The spell's fixed heightening, and each variant's, names each rank once, above the spell's own. */
function checkHeightenedRanks(context: SpellCheck): void {
  const { heightening, variants = [] } = context.value;
  checkRanksAt(context, ['heightening'], heightening);
  for (const [index, variant] of variants.entries()) {
    checkRanksAt(context, ['variants', index, 'heightening'], variant.heightening);
  }
}

/** A note on ending a spell early is for a spell that does not take the Dismiss action. */
function checkDismiss(context: SpellCheck): void {
  const { dismiss, dismissNote } = context.value;
  if (dismiss === true && dismissNote !== undefined) {
    pushIssue(context, ['dismissNote'], message(RulesMessage.SpellDismissBoth));
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
    variants: z.array(SpellVariant).min(1).max(VARIANTS_MAX).readonly().optional(),
    /** Ending it takes the Dismiss action, 1 action when done during a turn (Mirror Image); otherwise it ends at will. */
    dismiss: z.literal(true).optional(),
    /** Ending it early has a condition or a cost of its own (a free action or reaction, with a trigger), which a Dismiss button shows. */
    dismissNote: RichText.optional(),
    /** It counteracts (Dispel Magic). */
    counteraction: z.boolean().optional(),
    /**
     * The effects casting it can put on the caster, one per form it offers (Animal Form has one for each animal), so
     * casting can offer the forms. An effect with a predicate is offered only to a character it holds for (Untamed Form
     * lists Plant Form for a character with `feat:plant-shape`).
     */
    effects: FormEffects.optional(),
    /** Casting it changes the form the caster is already in to one of its `effects`, keeping the time left, rather than putting a form on (Untamed Shift). */
    shiftsForm: z.literal(true).optional(),
  })
  .check((context) => {
    checkIncreases(context);
    checkHeightenedRanks(context);
    checkDismiss(context);
  });
export type SpellData = z.infer<typeof SpellData>;
