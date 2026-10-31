import {
  buildRanks,
  documentSkills,
  LoreName,
  loreTopicOf,
  skillReads,
  skillSlots,
  withoutUnpickedLores,
} from '@pioneer/character/domain';
import type { CharacterDocument, LoreNames, SkillOption, SkillSlot, SlotContent } from '@pioneer/character/domain';
import { ChoiceValue, Level, Proficiency, ProficiencySchema } from '@pioneer/rules/sdk';
import type { Selector, SlotKey, Slug } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { matchKey } from './content-lookup';
import { PathbuilderName } from './import-kind';
import type { PathbuilderImport } from './read-pathbuilder-export';

export type SkillPicks = Readonly<Record<SlotKey, ChoiceValue>>;

/** A skill or Lore the export ranks higher than the build's skill slots reach: what it wanted, and what it got. */
export const SkillGap = z.object({
  name: PathbuilderName,
  wanted: ProficiencySchema,
  /** Undefined for a skill the content doesn't define. */
  reached: ProficiencySchema.optional(),
});
export type SkillGap = z.infer<typeof SkillGap>;

/** The picks for the character's skill slots, and the ranks they leave short of Pathbuilder's. */
export interface SkillPlacement {
  readonly choices: SkillPicks;
  /** The names of the Lores no content defines that the picks took, as the export named them (#572). */
  readonly lores: LoreNames;
  readonly gaps: readonly SkillGap[];
}

const RANK_ORDER: readonly Proficiency[] = Object.values(Proficiency);

function order(rank: Proficiency | undefined): number {
  return RANK_ORDER.indexOf(rank ?? Proficiency.Untrained);
}

/** A rank the export wants of a skill or Lore, by the name Pathbuilder gave it. */
interface Target {
  readonly name: PathbuilderName;
  readonly rank: Proficiency;
  /** The skill that carries it, when the content has one. */
  readonly skill: SkillOption | undefined;
}

/** The ranks an export gives its skills and Lores. */
export type SkillRanks = Pick<PathbuilderImport, 'lores' | 'skills'>;

/**
 * The Lores the export ranks that no content defines, by topic and as the export named them: a skill slot can take one as
 * a custom Lore (#572). A Lore whose name makes no topic is left out, and so comes back as a gap.
 */
function undefinedLores(skills: readonly SkillOption[], { lores }: SkillRanks): LoreNames {
  const known = new Set(skills.map(({ name }) => matchKey(name)));
  const entries = lores.flatMap(({ name }): [Slug, LoreName][] => {
    const lore = LoreName.safeParse(name);
    const topic = lore.success ? loreTopicOf(lore.data) : undefined;
    return lore.success && topic !== undefined && !known.has(matchKey(`${name} Lore`)) ? [[topic, lore.data]] : [];
  });
  return Object.fromEntries(entries);
}

function targets(skills: readonly SkillOption[], { skills: ranked, lores }: SkillRanks): Target[] {
  const find = (name: string): SkillOption | undefined =>
    skills.find((skill) => matchKey(skill.name) === matchKey(name));
  const named = Object.entries(ranked).flatMap(([key, rank]): Target[] => {
    const skill = find(key);
    return skill === undefined ? [] : [{ name: PathbuilderName.parse(skill.name), rank, skill }];
  });
  const lored = lores.map(({ name, rank }): Target => ({ name, rank, skill: find(`${name} Lore`) }));
  return [...named, ...lored].filter(({ rank }) => order(rank) > order(Proficiency.Untrained));
}

function documentWith(document: CharacterDocument, picks: SkillPicks): CharacterDocument {
  return { ...document, build: { ...document.build, choices: { ...document.build.choices, ...picks } } };
}

/** `document` naming the Lores the export has that no content defines, so its skill slots offer them. */
function documentNaming(document: CharacterDocument, lores: LoreNames): CharacterDocument {
  return { ...document, build: { ...document.build, lores: { ...document.build.lores, ...lores } } };
}

/** The ranks the build reaches so far, by skill selector. */
function reached(document: CharacterDocument, content: SlotContent): ReadonlyMap<Selector, Proficiency> {
  return buildRanks(document, content);
}

/** The skill `slot` offers that raises furthest toward its target, the largest shortfall first. */
function choose(
  slot: SkillSlot,
  wanted: readonly Target[],
  ranks: ReadonlyMap<Selector, Proficiency>,
): SkillOption | undefined {
  const shortfall = (option: SkillOption): number => {
    const target = wanted.find(({ skill }) => skill?.id === option.id);
    return target === undefined ? 0 : order(target.rank) - order(ranks.get(option.selector));
  };
  return slot.options
    .map((option) => ({ option, gap: shortfall(option) }))
    .filter(({ gap }) => gap > 0)
    .toSorted((left, right) => right.gap - left.gap)[0]?.option;
}

/** One more pick, in the first empty slot up to the character's level that offers a skill still short of its target. */
function advance(
  document: CharacterDocument,
  content: SlotContent,
  wanted: readonly Target[],
): [SlotKey, SkillOption] | undefined {
  const level = Level.parse(document.level);
  const ranks = reached(document, content);
  for (const slot of skillSlots(document, skillReads(document, content))) {
    const option = slot.level <= level && slot.stored === undefined ? choose(slot, wanted, ranks) : undefined;
    if (option !== undefined) {
      return [slot.key, option];
    }
  }
  return undefined;
}

function gapsOf(wanted: readonly Target[], ranks: ReadonlyMap<Selector, Proficiency>): SkillGap[] {
  return wanted.flatMap(({ name, rank, skill }): SkillGap[] => {
    const got = skill === undefined ? undefined : (ranks.get(skill.selector) ?? Proficiency.Untrained);
    return order(got) >= order(rank) ? [] : [{ name, wanted: rank, reached: got }];
  });
}

/**
 * Pathbuilder's skill and Lore ranks in `document`'s skill slots (#308): each trained skill and skill increase slot,
 * in the order they are read, takes the skill furthest short of its rank that it offers. A Lore the content has no
 * entry for is offered as a custom Lore, named as the export names it (#572). Whatever the slots can't reach comes back
 * as a gap.
 */
export function placeSkills(plain: CharacterDocument, content: SlotContent, ranks: SkillRanks): SkillPlacement {
  const document = documentNaming(plain, undefinedLores(content.skills.skills, ranks));
  const wanted = targets(documentSkills(document, content.skills).skills, ranks);
  const picks: Record<SlotKey, ChoiceValue> = {};
  const slotCount = skillSlots(document, skillReads(document, content)).length;
  for (let pass = 0; pass < slotCount; pass += 1) {
    const next = advance(documentWith(document, picks), content, wanted);
    if (next === undefined) {
      break;
    }
    picks[next[0]] = ChoiceValue.parse(next[1].id);
  }
  const placed = documentWith(document, picks);
  return {
    choices: picks,
    lores: withoutUnpickedLores(placed).build.lores,
    gaps: gapsOf(wanted, reached(placed, content)),
  };
}
