import { Proficiency, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { kebab } from './foundry-flags';
import { SKILLS } from './foundry-skills';

/** Foundry's ranks by number, trained (1) to legendary (4). */
const RANKS = [Proficiency.Trained, Proficiency.Expert, Proficiency.Master, Proficiency.Legendary] as const;
const LOWEST_RANK = 1;

/** `system.skills.<skill>.rank`: the skill's slug is the segment between. */
const SKILL_RANK_PATH = /^system\.skills\.(?<skill>[a-z]+)\.rank$/u;

/**
 * `system.skills.{item|flags.system.rulesSelections.<flag>}.rank`: the skill is the pick a `ChoiceSet` stored. Some
 * rules leave out the `.rank`, which Foundry reads the same.
 */
const CHOSEN_SKILL_RANK_PATH =
  /^system\.skills\.\{item\|flags\.system\.rulesSelections\.(?<flag>[A-Za-z0-9]+)\}(?:\.rank)?$/u;

/** A pick read whole, as the path of an `ActiveEffectLike`: `{item|flags.system.rulesSelections.<flag>}`. */
const WHOLE_PICK_PATH = /^\{item\|flags\.system\.rulesSelections\.(?<flag>[A-Za-z0-9]+)\}$/u;

const SKILL_PREFIX = 'skill';

/** `system.proficiencies.<group>.<category>.rank`: a weapon or armour category's rank. */
const CATEGORY_RANK_PATH = /^system\.proficiencies\.(?<group>attacks|defenses)\.(?<category>[a-z]+)\.rank$/u;

/** `system.proficiencies.spellcasting.rank`: the one rank of all the character's spellcasting. */
const SPELLCASTING_RANK_PATH = 'system.proficiencies.spellcasting.rank';

/** The categories Foundry ranks in each group, with the selector prefix of the group. */
interface CategoryGroup {
  readonly prefix: string;
  readonly categories: ReadonlySet<string>;
}

const CATEGORY_GROUPS: ReadonlyMap<string, CategoryGroup> = new Map([
  ['attacks', { prefix: 'attack', categories: new Set(['unarmed', 'simple', 'martial', 'advanced']) }],
  ['defenses', { prefix: 'defense', categories: new Set(['unarmored', 'light', 'medium', 'heavy']) }],
]);

/** Foundry's raise of a skill's rank: an `ActiveEffectLike` upgrading it to a fixed rank. */
const FoundrySkillRaise = z.strictObject({
  key: z.literal('ActiveEffectLike'),
  mode: z.literal('upgrade'),
  path: z.string(),
  value: z.number().int().min(LOWEST_RANK).max(RANKS.length),
  predicate: z.unknown().optional(),
});

/** The selector of a weapon or armour category's rank path, or none when the path or category is not one. */
function categorySelectorOf(path: string): string | undefined {
  const { group, category } = CATEGORY_RANK_PATH.exec(path)?.groups ?? {};
  const known = group === undefined ? undefined : CATEGORY_GROUPS.get(group);
  return known !== undefined && category !== undefined && known.categories.has(category)
    ? `${known.prefix}:${category}`
    : undefined;
}

/**
 * The selector a raise's path names: a fixed skill's, a `ChoiceSet`'s pick behind `skill`, a weapon or armour
 * category's, spellcasting's, or none.
 */
function selectorOf(path: string): unknown {
  if (path === SPELLCASTING_RANK_PATH) {
    return 'spellcasting';
  }
  const category = categorySelectorOf(path);
  if (category !== undefined) {
    return category;
  }
  const skill = SKILL_RANK_PATH.exec(path)?.groups?.['skill'];
  if (skill !== undefined) {
    return SKILLS.has(skill) ? `${SKILL_PREFIX}:${skill}` : undefined;
  }
  const flag = CHOSEN_SKILL_RANK_PATH.exec(path)?.groups?.['flag'];
  return flag === undefined ? undefined : { choice: kebab(flag), prefix: SKILL_PREFIX };
}

/**
 * Foundry's `ActiveEffectLike` upgrading a skill's rank to a fixed rank (Dwarven Weapon Cunning's trained Athletics,
 * a dedication's skill, Skill Training's pick) as a `Proficiency` element on `skill:<skill>`, or on the skill a
 * `ChoiceSet` stored (ADR-0053). The same upgrade of a weapon or armour category (`attack:martial`, `defense:heavy`)
 * or of spellcasting is one on that selector. A skill outside the sixteen (a Lore), a base weapon
 * (`weapon-base-club`), a formula value, an override or any other field leaves it for the backlog.
 */
export function withSkillRaise(raw: unknown): unknown {
  const raise = FoundrySkillRaise.safeParse(raw);
  if (!raise.success) {
    return raw;
  }
  const { path, value, predicate } = raise.data;
  const selector = selectorOf(path);
  if (selector === undefined) {
    return raw;
  }
  return {
    key: RuleElementKey.Proficiency,
    selector,
    rank: RANKS[value - LOWEST_RANK],
    ...(predicate === undefined ? {} : { predicate }),
  };
}

type Fields = Readonly<Record<string, unknown>>;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The skill a choice's value names as a rank path (`system.skills.arcana.rank`), or none. */
function skillOfPath(value: unknown): string | undefined {
  const skill = typeof value === 'string' ? SKILL_RANK_PATH.exec(value)?.groups?.['skill'] : undefined;
  return skill !== undefined && SKILLS.has(skill) ? skill : undefined;
}

/** The flag of a `ChoiceSet` whose every choice is a skill's rank path, with the skill each names. */
function skillPathPicks(raws: readonly unknown[]): ReadonlySet<string> {
  const found = new Set<string>();
  for (const raw of raws) {
    if (
      isFields(raw) &&
      raw['key'] === 'ChoiceSet' &&
      typeof raw['flag'] === 'string' &&
      Array.isArray(raw['choices'])
    ) {
      const choices: readonly unknown[] = raw['choices'];
      const skills = choices.map((choice) => (isFields(choice) ? skillOfPath(choice['value']) : undefined));
      if (skills.length > 0 && skills.every((skill) => skill !== undefined)) {
        found.add(raw['flag']);
      }
    }
  }
  return found;
}

/** A choice with its value the skill its rank path names. */
function withSkillValue(choice: unknown): unknown {
  return isFields(choice) ? { ...choice, value: skillOfPath(choice['value']) } : choice;
}

/**
 * `raws` with each `ChoiceSet` whose choices are skills' rank paths (Elemental Lore's `system.skills.arcana.rank`) offering
 * the skills by slug, and the `ActiveEffectLike` that upgrades the pick as a whole path made the upgrade of that
 * skill's rank. Any other rule is as it was.
 */
export function withSkillPathChoices(raws: readonly unknown[]): readonly unknown[] {
  const picks = skillPathPicks(raws);
  if (picks.size === 0) {
    return raws;
  }
  return raws.map((raw) => {
    if (!isFields(raw)) {
      return raw;
    }
    if (raw['key'] === 'ChoiceSet' && typeof raw['flag'] === 'string' && picks.has(raw['flag'])) {
      const choices: readonly unknown[] = Array.isArray(raw['choices']) ? raw['choices'] : [];
      return {
        ...raw,
        choices: choices.map((choice) => withSkillValue(choice)),
      };
    }
    const flag = typeof raw['path'] === 'string' ? WHOLE_PICK_PATH.exec(raw['path'])?.groups?.['flag'] : undefined;
    if (raw['key'] === 'ActiveEffectLike' && flag !== undefined && picks.has(flag)) {
      return { ...raw, path: `system.skills.{item|flags.system.rulesSelections.${flag}}.rank` };
    }
    return raw;
  });
}
