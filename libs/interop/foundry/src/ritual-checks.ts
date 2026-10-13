import { ProficiencySchema, RitualCheckPick } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { loreSelector, loreTopic } from './foundry-lore';

/**
 * A ritual's checks, which Foundry writes as English ("Arcana (expert), Occultism (expert), or Religion (expert)";
 * secondary checks "Medicine, Society"), as `RitualCheck`s. A check is one of its skills, at one proficiency rank
 * when it names one, with the DC, the pick and the Lore topic it states. Anything else (a note such as "you must be
 * a demon") is undefined, for
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

/** Separate secondary checks: "Medicine, Society"; where Foundry uses `;`, only that separates them. */
const CHECKS = /, /u;
const CHECKS_SEMICOLON = /;\s*/u;

/** A rank in parentheses after a skill: "Arcana (expert)". */
const RANK_OPEN = ' (';
const RANK_CLOSE = ')';

/** A check's own DC, ahead of its skills: "DC 29 Nature or Religion". */
const DC_PREFIX = /^DC (?<dc>\d{1,3}) /iu;

/** Tradition picks the skill, after the skills: "Arcana, Nature or Religion as determined by the tradition of …". */
const TRADITION_SUFFIX = ' as determined by the tradition of spell cast in the ritual';

/** A note on which of the primary check's skills the secondary check uses, in parentheses. */
const PICKS: ReadonlyMap<string, RitualCheckPick> = new Map([
  ['whichever is used for the primary check', RitualCheckPick.PrimaryUsed],
  ["whichever isn't used for the primary check", RitualCheckPick.PrimaryUnused],
]);

/** A note on the pick, which closes the group of alternatives before it. */
const PICK_NOTE = /\(whichever /u;

const WORD = /^[a-z]+$/iu;
const LORE = 'lore';
const LORE_ANY = 'any';
const LORE_RELATED = 'related to ';
const LORE_SELECTOR = 'skill:lore';

/** A skill as written: its words, and what follows in parentheses, if anything. */
interface Written {
  readonly name: string;
  readonly note?: string;
}

function written(text: string): Written {
  const value = text.trim();
  const open = value.lastIndexOf(RANK_OPEN);
  if (open === -1 || !value.endsWith(RANK_CLOSE)) {
    return { name: value };
  }
  return { name: value.slice(0, open), note: value.slice(open + RANK_OPEN.length, -RANK_CLOSE.length) };
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

/** One skill of a check, with what its parentheses said: a rank, a pick, or what a Lore relates to. */
interface Skill {
  readonly selector: string;
  readonly rank?: string;
  readonly pick?: RitualCheckPick;
  readonly relatedTo?: string;
}

/** "Lore (any)" or "Lore (related to the destination plane)": any Lore, by what it relates to if it says. */
function anyLoreOf(note: string | undefined): Skill | undefined {
  if (note === LORE_ANY) {
    return { selector: LORE_SELECTOR };
  }
  if (note === undefined || !note.startsWith(LORE_RELATED)) {
    return undefined;
  }
  const relatedTo = note.slice(LORE_RELATED.length).trim();
  return relatedTo === '' ? undefined : { selector: LORE_SELECTOR, relatedTo };
}

function skillOf(text: string): Skill | undefined {
  const { name, note } = written(text);
  if (name.toLowerCase() === LORE) {
    return anyLoreOf(note);
  }
  const selector = skillSelector(name);
  const pick = note === undefined ? undefined : PICKS.get(note);
  if (selector === undefined) {
    return undefined;
  }
  if (pick !== undefined) {
    return { selector, pick };
  }
  return { selector, ...(note === undefined ? {} : { rank: note }) };
}

/** A skill at a rank of its own. */
interface RankedSkill {
  readonly skill: string;
  readonly proficiency: string;
}

/** The ranks the skills name, each as a proficiency; undefined when one is not a rank. */
function rankedSkills(skills: readonly Skill[]): RankedSkill[] | undefined {
  const ranked = skills.flatMap(({ selector, rank }) => {
    const proficiency = rank === undefined ? undefined : ProficiencySchema.safeParse(rank.toLowerCase()).data;
    return proficiency === undefined ? [] : [{ skill: selector, proficiency }];
  });
  return ranked.length === skills.length ? ranked : undefined;
}

/** The ranks of a check: one for all its skills when they agree, else one each, else undefined when they cannot. */
function ranksOf(skills: readonly Skill[]): object | undefined {
  const named = skills.flatMap(({ rank }) => rank ?? []);
  const rank = new Set(named);
  if (rank.size === 0) {
    return {};
  }
  if (rank.size === 1) {
    const [only] = named;
    const proficiency = only === undefined ? undefined : ProficiencySchema.safeParse(only.toLowerCase()).data;
    return proficiency === undefined ? undefined : { proficiency };
  }
  const ranked = rankedSkills(skills);
  return ranked && { ranked };
}

/** The one value the skills state, or none; undefined when they state more than one. */
function single<TValue>(values: readonly TValue[]): TValue[] | undefined {
  const distinct = [...new Set(values)];
  return distinct.length > 1 ? undefined : distinct;
}

/** What a check's skills state besides their ranks: how the skill is picked, and what a Lore relates to. */
interface Stated {
  readonly pick?: RitualCheckPick;
  readonly loreRelatedTo?: string;
}

/** The pick and Lore topic the skills state, `tradition` when the text says so; undefined when they conflict. */
function statedOf(skills: readonly Skill[], tradition: boolean): Stated | undefined {
  const picks = skills.flatMap(({ pick }) => pick ?? []);
  const picked = single(tradition ? [...picks, RitualCheckPick.Tradition] : picks);
  const topics = single(skills.flatMap(({ relatedTo }) => relatedTo ?? []));
  if (picked === undefined || topics === undefined) {
    return undefined;
  }
  const [pick] = picked;
  const [loreRelatedTo] = topics;
  return {
    ...(pick === undefined ? {} : { pick }),
    ...(loreRelatedTo === undefined ? {} : { loreRelatedTo }),
  };
}

/** One check: its skills, their ranks, and the pick, Lore topic and DC it states. */
function checkOf(text: string): object | undefined {
  const dc = DC_PREFIX.exec(text)?.groups?.['dc'];
  const body = text.replace(DC_PREFIX, '').replace(TRADITION_SUFFIX, '');
  const parts = body.split(ALTERNATIVES);
  const skills = parts.flatMap((part) => skillOf(part) ?? []);
  const ranks = ranksOf(skills);
  const stated = statedOf(skills, text.endsWith(TRADITION_SUFFIX));
  if (skills.length < parts.length || ranks === undefined || stated === undefined) {
    return undefined;
  }
  return {
    skills: skills.map(({ selector }) => selector),
    ...ranks,
    ...stated,
    ...(dc === undefined ? {} : { dc: Number(dc) }),
  };
}

/** The primary check, one check of any of its skills. */
export function primaryCheckOf(text: string): object | undefined {
  return checkOf(text.trim());
}

/**
 * The checks Foundry separates by commas, with a group of alternatives that ends in a note ("Nature, Occultism or
 * Religion (whichever is used for the primary check)") kept as one check.
 */
function commaChecks(text: string): string[] {
  const checks: string[] = [];
  for (const part of text.split(CHECKS)) {
    const previous = checks.at(-1);
    const joins =
      previous !== undefined && PICK_NOTE.test(part) && !previous.includes(' or ') && !previous.includes('(');
    if (joins) {
      checks[checks.length - 1] = `${previous}, ${part}`;
    } else {
      checks.push(part);
    }
  }
  return checks;
}

/** The secondary checks, each its own; blank text is none. */
export function secondaryChecksOf(text: string): object[] | undefined {
  const value = text.trim();
  if (value === '') {
    return [];
  }
  const parts = value.includes(';') ? value.split(CHECKS_SEMICOLON) : commaChecks(value);
  const checks = parts.flatMap((part) => checkOf(part.trim()) ?? []);
  return checks.length < parts.length ? undefined : checks;
}

/** The Lores a ritual's check text names ("Legal Lore"), by Foundry's name for each. */
export function loresNamed(text: string): string[] {
  return text
    .split(CHECKS_SEMICOLON)
    .flatMap((part) => part.split(ALTERNATIVES))
    .map((part) => written(part).name)
    .filter((name) => isLore(name));
}
