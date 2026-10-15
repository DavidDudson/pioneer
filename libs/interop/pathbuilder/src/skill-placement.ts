import { buildRanks, skillReads, skillSlots } from '@pioneer/character/domain';
import type { CharacterDocument, SkillOption, SkillSlot, SlotContent } from '@pioneer/character/domain';
import { ChoiceValue, Level, Proficiency, ProficiencySchema } from '@pioneer/rules/sdk';
import type { Selector, SlotKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { matchKey } from './content-lookup';
import { PathbuilderName } from './import-kind';
import type { PathbuilderImport } from './read-pathbuilder-export';

export type SkillPicks = Readonly<Record<SlotKey, ChoiceValue>>;

/** A skill or Lore the export ranks higher than the build's skill slots reach: what it wanted, and what it got. */
export const SkillGap = z.object({
  name: PathbuilderName,
  wanted: ProficiencySchema,
  /** Undefined for a Lore the content doesn't define, which no slot can offer. */
  reached: ProficiencySchema.optional(),
});
export type SkillGap = z.infer<typeof SkillGap>;

/** The picks for the character's skill slots, and the ranks they leave short of Pathbuilder's. */
export interface SkillPlacement {
  readonly choices: SkillPicks;
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
 * in the order they are read, takes the skill furthest short of its rank that it offers. Whatever the slots can't
 * reach comes back as a gap, a Lore the content has no entry for included.
 */
export function placeSkills(document: CharacterDocument, content: SlotContent, ranks: SkillRanks): SkillPlacement {
  const wanted = targets(content.skills.skills, ranks);
  const picks: Record<SlotKey, ChoiceValue> = {};
  const slotCount = skillSlots(document, skillReads(document, content)).length;
  for (let pass = 0; pass < slotCount; pass += 1) {
    const next = advance(documentWith(document, picks), content, wanted);
    if (next === undefined) {
      break;
    }
    picks[next[0]] = ChoiceValue.parse(next[1].id);
  }
  return { choices: picks, gaps: gapsOf(wanted, reached(documentWith(document, picks), content)) };
}
