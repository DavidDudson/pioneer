import { Attribute, CompanionSkill, CompanionTier, DiceCount, Modifier, Proficiency, Size } from '@pioneer/rules/sdk';
import type { CompanionSkill as CompanionSkillName } from '@pioneer/rules/sdk';

/** What one tier changes in an animal companion (Player Core p. 211). Each tier a companion has reached applies. */
export interface TierAdvance {
  /** Added to the type's attribute modifiers. */
  readonly attributes: Readonly<Partial<Record<Attribute, Modifier>>>;
  /** Skills raised to a rank; a skill the type already trains goes one rank higher than the trained rank given. */
  readonly skills: Readonly<Partial<Record<CompanionSkillName, Proficiency>>>;
  /** The rank that saves and Perception reach, when this tier raises them. */
  readonly defence: Proficiency | undefined;
  /** The rank unarmed attacks reach, when this tier raises them. */
  readonly unarmed: Proficiency | undefined;
  /** Damage dice added to each unarmed attack. */
  readonly dice: DiceCount;
  /** Flat unarmed damage added, which a specialized companion doubles. */
  readonly flat: Modifier;
  /** Whether a Medium or smaller companion grows one size. */
  readonly grows: boolean;
}

const PLUS_ONE = Modifier.parse(1);
const PLUS_TWO = Modifier.parse(2);
const PLUS_THREE = Modifier.parse(3);
const NO_FLAT = Modifier.parse(0);
const ONE_DIE = DiceCount.parse(1);
const NO_DICE = DiceCount.parse(0);

const NONE: TierAdvance = {
  attributes: {},
  skills: {},
  defence: undefined,
  unarmed: undefined,
  dice: NO_DICE,
  flat: NO_FLAT,
  grows: false,
};

/** The change each tier makes. Young is the type's own block, so it changes nothing. */
export const TIER_ADVANCE: Readonly<Record<CompanionTier, TierAdvance>> = {
  [CompanionTier.Young]: NONE,
  [CompanionTier.Mature]: {
    ...NONE,
    attributes: {
      [Attribute.Strength]: PLUS_ONE,
      [Attribute.Dexterity]: PLUS_ONE,
      [Attribute.Constitution]: PLUS_ONE,
      [Attribute.Wisdom]: PLUS_ONE,
    },
    skills: {
      [CompanionSkill.Intimidation]: Proficiency.Trained,
      [CompanionSkill.Stealth]: Proficiency.Trained,
      [CompanionSkill.Survival]: Proficiency.Trained,
    },
    defence: Proficiency.Expert,
    dice: ONE_DIE,
    grows: true,
  },
  [CompanionTier.Nimble]: {
    ...NONE,
    attributes: {
      [Attribute.Dexterity]: PLUS_TWO,
      [Attribute.Strength]: PLUS_ONE,
      [Attribute.Constitution]: PLUS_ONE,
      [Attribute.Wisdom]: PLUS_ONE,
    },
    skills: { [CompanionSkill.Acrobatics]: Proficiency.Expert },
    flat: PLUS_TWO,
  },
  [CompanionTier.Savage]: {
    ...NONE,
    attributes: {
      [Attribute.Strength]: PLUS_TWO,
      [Attribute.Dexterity]: PLUS_ONE,
      [Attribute.Constitution]: PLUS_ONE,
      [Attribute.Wisdom]: PLUS_ONE,
    },
    skills: { [CompanionSkill.Athletics]: Proficiency.Expert },
    flat: PLUS_THREE,
    grows: true,
  },
  [CompanionTier.Specialized]: {
    ...NONE,
    attributes: { [Attribute.Dexterity]: PLUS_ONE, [Attribute.Intelligence]: PLUS_TWO },
    defence: Proficiency.Master,
    unarmed: Proficiency.Expert,
    dice: ONE_DIE,
  },
};

/** The sizes in order, so a companion can grow one. */
export const SIZE_ORDER: readonly Size[] = [Size.Tiny, Size.Small, Size.Medium, Size.Large, Size.Huge, Size.Gargantuan];
