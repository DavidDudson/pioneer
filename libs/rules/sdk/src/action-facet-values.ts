import type { ValueOf } from '@pioneer/shared/kernel';

import type { ActionData } from './action';
import type { ContentEntry } from './content-entry';
import type { ContentKind } from './content-kind';
import { FeatCategory } from './feat';
import { ActionCost } from './rich-text';
import type { Selector } from './selector';
import { Trait } from './trait';

export type FeatEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Feat }>;
export type ActionEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Action }>;

/** What using something costs: its glyph, `variable` for a range the user picks from, `passive` for no use. */
export const ActionCostValue = { ...ActionCost, Variable: 'variable', Passive: 'passive' } as const;
export type ActionCostValue = ValueOf<typeof ActionCostValue>;

/** When an action is used: in encounters unless it has the `exploration` or `downtime` trait. */
export const ActionMode = { Encounter: 'encounter', Exploration: 'exploration', Downtime: 'downtime' } as const;
export type ActionMode = ValueOf<typeof ActionMode>;

/** A skill as a facet value: every Lore is one `lore`, and `none` is an entry about no skill. */
export const SkillValue = {
  Acrobatics: 'acrobatics',
  Arcana: 'arcana',
  Athletics: 'athletics',
  Crafting: 'crafting',
  Deception: 'deception',
  Diplomacy: 'diplomacy',
  Intimidation: 'intimidation',
  Lore: 'lore',
  Medicine: 'medicine',
  Nature: 'nature',
  Occultism: 'occultism',
  Performance: 'performance',
  Religion: 'religion',
  Society: 'society',
  Stealth: 'stealth',
  Survival: 'survival',
  Thievery: 'thievery',
  None: 'none',
} as const;
export type SkillValue = ValueOf<typeof SkillValue>;

const SKILL_PREFIX = 'skill:';
const LORE_PREFIX = 'skill:lore-';
const SKILL_TRAIT = Trait.parse('skill');
const EXPLORATION = Trait.parse('exploration');
const DOWNTIME = Trait.parse('downtime');
const ARCHETYPE = Trait.parse('archetype');
/** The listed skills by selector. `none` and `lore` are facet values only: Lore is read by its prefix. */
const SKILLS: ReadonlyMap<string, SkillValue> = new Map(
  Object.values(SkillValue)
    .filter((value) => value !== SkillValue.None && value !== SkillValue.Lore)
    .map((value) => [`${SKILL_PREFIX}${value}`, value]),
);

/** The cost of using `action`, or `passive` for an entry that isn't used. */
export function actionCostValue(action: ActionData | undefined): ActionCostValue {
  if (action?.upTo !== undefined) {
    return ActionCostValue.Variable;
  }
  return action?.cost ?? ActionCostValue.Passive;
}

export function actionMode({ traits }: ActionEntry): ActionMode {
  if (traits.includes(DOWNTIME)) {
    return ActionMode.Downtime;
  }
  return traits.includes(EXPLORATION) ? ActionMode.Exploration : ActionMode.Encounter;
}

/** The skill a selector names; `undefined` (unknown) for one that isn't a skill Pioneer lists. */
function skillValue(selector: Selector): SkillValue | undefined {
  return selector.startsWith(LORE_PREFIX) ? SkillValue.Lore : SKILLS.get(selector);
}

/**
 * The skills an entry names. With none, an entry that should name one (a skill feat, the `skill` trait) gives
 * `undefined` so it counts as unknown; any other is about no skill.
 */
function skillValues(skills: readonly Selector[], expectsSkill: boolean): readonly (SkillValue | undefined)[] {
  if (skills.length > 0) {
    return skills.map((selector) => skillValue(selector));
  }
  return expectsSkill ? [undefined] : [SkillValue.None];
}

export function featSkills({ data, traits }: FeatEntry): readonly (SkillValue | undefined)[] {
  const skills = [...(data.skills ?? []), ...(data.action?.skills ?? [])];
  return skillValues(skills, data.category === FeatCategory.Skill || traits.includes(SKILL_TRAIT));
}

export function actionSkills({ data, traits }: ActionEntry): readonly (SkillValue | undefined)[] {
  return skillValues(data.skills ?? [], traits.includes(SKILL_TRAIT));
}

/**
 * The archetype a feat belongs to. A feat with the `archetype` trait but no archetype named gives `undefined`
 * (unknown); any other feat gives none, so picking an archetype keeps only its feats.
 */
export function featArchetype({ data, traits }: FeatEntry): readonly unknown[] {
  if (data.archetype !== undefined) {
    return [data.archetype];
  }
  return traits.includes(ARCHETYPE) ? [undefined] : [];
}
