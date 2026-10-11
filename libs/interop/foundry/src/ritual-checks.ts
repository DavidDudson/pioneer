import { ProficiencySchema } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { loreSelector, loreTopic } from './foundry-lore';

/**
 * A ritual's checks, which Foundry writes as English ("Arcana (expert), Occultism (expert), or Religion (expert)";
 * secondary checks "Medicine, Society"), as `RitualCheck`s. A check is one of its skills, at one proficiency rank
 * when it names one. Anything else (a DC, a condition in the parentheses, "whichever isn't used") is undefined, for
 * the caller to report.
 */

const CHECK_MAX = 2000;
const CheckText = z.string().max(CHECK_MAX);

/** Foundry's `ritual`: the primary check, and the secondary casters and their checks. */
export const FoundryRitual = z.looseObject({
  primary: z.looseObject({ check: CheckText }),
  secondary: z.looseObject({ casters: z.number(), checks: CheckText }),
});
export type FoundryRitual = z.infer<typeof FoundryRitual>;

const SKILLS: ReadonlySet<string> = new Set([
  'acrobatics',
  'arcana',
  'athletics',
  'crafting',
  'deception',
  'diplomacy',
  'intimidation',
  'medicine',
  'nature',
  'occultism',
  'performance',
  'religion',
  'society',
  'stealth',
  'survival',
  'thievery',
]);

/** The skills of one check: "Arcana, Nature, or Occultism", "Society or Legal Lore". */
const ALTERNATIVES = /,? or |, /u;

/** Separate secondary checks: "Medicine, Society". */
const CHECKS = /, /u;

/** A rank in parentheses after a skill: "Arcana (expert)". */
const RANK_OPEN = ' (';
const RANK_CLOSE = ')';

const WORD = /^[a-z]+$/iu;
const LORE = 'lore';

/** A skill as written: its words, and the rank in parentheses after them, if any. */
interface Written {
  readonly name: string;
  readonly rank?: string;
}

function written(text: string): Written {
  const value = text.trim();
  const open = value.lastIndexOf(RANK_OPEN);
  if (open === -1 || !value.endsWith(RANK_CLOSE)) {
    return { name: value };
  }
  return { name: value.slice(0, open), rank: value.slice(open + RANK_OPEN.length, -RANK_CLOSE.length) };
}

/** Whether the words name a Lore: "Legal Lore", "Pathfinder Society Lore". */
function isLore(name: string): boolean {
  const words = name.split(' ');
  return words.length > 1 && words.at(-1)?.toLowerCase() === LORE && words.every((word) => WORD.test(word));
}

/** A skill's selector from its words; a Lore by its topic. */
function skillSelector(name: string): string | undefined {
  if (isLore(name)) {
    return loreSelector(loreTopic(name));
  }
  const skill = name.toLowerCase();
  return SKILLS.has(skill) ? `skill:${skill}` : undefined;
}

interface Skill {
  readonly selector: string;
  readonly rank?: string;
}

function skillOf(text: string): Skill | undefined {
  const { name, rank } = written(text);
  const selector = skillSelector(name);
  return selector === undefined ? undefined : { selector, ...(rank === undefined ? {} : { rank }) };
}

/** One check: its skills, and the one rank they name, if any. Ranks that differ do not map. */
function checkOf(text: string): object | undefined {
  const parts = text.split(ALTERNATIVES);
  const skills = parts.flatMap((part) => skillOf(part) ?? []);
  const ranks = new Set(skills.flatMap(({ rank }) => rank ?? []));
  const [rank] = ranks;
  const proficiency = rank === undefined ? undefined : ProficiencySchema.safeParse(rank.toLowerCase()).data;
  if (skills.length < parts.length || ranks.size > 1 || (rank !== undefined && proficiency === undefined)) {
    return undefined;
  }
  return { skills: skills.map(({ selector }) => selector), ...(proficiency === undefined ? {} : { proficiency }) };
}

/** The primary check, one check of any of its skills. */
export function primaryCheckOf(text: string): object | undefined {
  return checkOf(text);
}

/** The secondary checks, each its own; blank text is none. */
export function secondaryChecksOf(text: string): object[] | undefined {
  const value = text.trim();
  if (value === '') {
    return [];
  }
  const parts = value.split(CHECKS);
  const checks = parts.flatMap((part) => checkOf(part) ?? []);
  return checks.length < parts.length ? undefined : checks;
}

/** The Lores a ritual's check text names ("Legal Lore"), by Foundry's name for each. */
export function loresNamed(text: string): string[] {
  return text
    .split(ALTERNATIVES)
    .flatMap((part) => part.split(CHECKS))
    .map((part) => written(part).name)
    .filter((name) => isLore(name));
}
