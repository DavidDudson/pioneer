import {
  buildRanks,
  characterGrants,
  documentSkills,
  LoreName,
  loreTopicOf,
  skillReads,
  skillSlots,
  withoutUnpickedLores,
} from '@pioneer/character/domain';
import type { CharacterDocument, LoreNames, SkillOption, SkillSlot, SlotContent } from '@pioneer/character/domain';
import type { ChoiceSlot } from '@pioneer/rules/grants';
import { ChoiceValue, Level, Proficiency, ProficiencySchema } from '@pioneer/rules/sdk';
import type { Selector, SlotKey, Slug } from '@pioneer/rules/sdk';
import { foldName } from '@pioneer/shared/utils';
import * as z from 'zod';

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
  readonly gaps: ReadonlyArray<SkillGap>;
}

const RANK_ORDER: ReadonlyArray<Proficiency> = Object.values(Proficiency);

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
function undefinedLores(skills: ReadonlyArray<SkillOption>, { lores }: SkillRanks): LoreNames {
  const known = new Set(skills.map(({ name }) => foldName(name)));

  const entries = lores.flatMap(({ name }): Array<[Slug, LoreName]> => {
    const lore = LoreName.safeParse(name);
    const topic = lore.success ? loreTopicOf(lore.data) : undefined;

    return lore.success && topic !== undefined && !known.has(foldName(`${name} Lore`)) ? [[topic, lore.data]] : [];
  });

  return Object.fromEntries(entries);
}

function targets(skills: ReadonlyArray<SkillOption>, { skills: ranked, lores }: SkillRanks): Array<Target> {
  const find = (name: string): SkillOption | undefined =>
    skills.find((skill) => foldName(skill.name) === foldName(name));

  const named = Object.entries(ranked).flatMap(([key, rank]): Array<Target> => {
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
  wanted: ReadonlyArray<Target>,
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
  wanted: ReadonlyArray<Target>,
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

/** Whether a feat's choice option names `skill`, by its value or its label. */
function names(option: ChoiceSlot['options'][number], skill: SkillOption): boolean {
  const skillName = foldName(skill.name);

  return [option.value, option.label].some((text) => foldName(text) === skillName);
}

/**
 * One more pick, in the first open choice of a placed feat or dedication that trains a skill still untrained that the
 * export ranks. Pathbuilder records no choice for these feats, so the wanted ranks decide.
 */
function advanceFeatChoice(
  document: CharacterDocument,
  content: SlotContent,
  wanted: ReadonlyArray<Target>,
): [SlotKey, ChoiceValue] | undefined {
  const ranks = reached(document, content);

  const untrained = wanted.flatMap(({ skill }): Array<SkillOption> =>
    skill !== undefined && order(ranks.get(skill.selector)) === order(Proficiency.Untrained) ? [skill] : [],
  );

  const { open } = characterGrants(document, content);

  for (const skill of untrained) {
    for (const slot of open) {
      const option = slot.options.find((each) => names(each, skill));

      if (option !== undefined) {
        return [slot.key, ChoiceValue.parse(option.value)];
      }
    }
  }

  return undefined;
}

/** The picks that answer the open feat choices the export's untrained skills fit, one at a time: each takes a slot, so it ends. */
function answerFeatChoices(
  document: CharacterDocument,
  content: SlotContent,
  wanted: ReadonlyArray<Target>,
): SkillPicks {
  const next = advanceFeatChoice(document, content, wanted);

  if (next === undefined) {
    return {};
  }

  const [key, value] = next;

  return { [key]: value, ...answerFeatChoices(documentWith(document, { [key]: value }), content, wanted) };
}

function gapsOf(wanted: ReadonlyArray<Target>, ranks: ReadonlyMap<Selector, Proficiency>): Array<SkillGap> {
  return wanted.flatMap(({ name, rank, skill }): Array<SkillGap> => {
    const got = skill === undefined ? undefined : (ranks.get(skill.selector) ?? Proficiency.Untrained);

    return order(got) >= order(rank) ? [] : [{ name, wanted: rank, reached: got }];
  });
}

/** The picks that fill the skill slots, one at a time, each taking the skill furthest short of its rank. */
function fillSlots(document: CharacterDocument, content: SlotContent, wanted: ReadonlyArray<Target>): SkillPicks {
  const picks: Record<SlotKey, ChoiceValue> = {};
  const slotCount = skillSlots(document, skillReads(document, content)).length;

  for (let pass = 0; pass < slotCount; pass += 1) {
    const next = advance(documentWith(document, picks), content, wanted);

    if (next === undefined) {
      break;
    }

    picks[next[0]] = ChoiceValue.parse(next[1].id);
  }

  return picks;
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
  const slotPicks = fillSlots(document, content, wanted);
  const picks = { ...slotPicks, ...answerFeatChoices(documentWith(document, slotPicks), content, wanted) };
  const placed = documentWith(document, picks);

  return {
    choices: picks,
    lores: withoutUnpickedLores(placed).build.lores,
    gaps: gapsOf(wanted, reached(placed, content)),
  };
}
