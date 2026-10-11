import { ContentId, ContentKind, Level } from '@pioneer/rules/sdk';
import type { ContentRegistry, ContentText, Selector, SkillCount, StatisticId } from '@pioneer/rules/sdk';

import { CHARACTER_LEVEL_MAX } from './character-fields';

/** A skill or Lore a pick names: its statistic entry, the selector whose rank it raises, and its name. */
export interface SkillOption {
  readonly id: ContentId;
  readonly selector: Selector;
  readonly name: ContentText;
}

/** What a class gives the skills: how many it trains by the player's choice, and the levels of its skill increases. */
interface ClassSkills {
  readonly additional: SkillCount;
  readonly increaseLevels: readonly Level[];
}

/** What skill slots are read from: every skill and Lore statistic loaded, and each class's skills, by id. */
export interface SkillContent {
  readonly skills: readonly SkillOption[];
  readonly classSkills: (id: ContentId) => ClassSkills | undefined;
}

/** A skill's or a Lore's selector starts so: `skill:athletics`, `skill:lore:sailing`. */
export const SKILL_PREFIX = 'skill:';
/** Player Core's skill increases: 3rd level and every second level after. */
const INCREASE_FIRST = 3;
const INCREASE_STEP = 2;
const PLAYER_CORE_INCREASES: readonly Level[] = Array.from(
  { length: Math.floor((CHARACTER_LEVEL_MAX - INCREASE_FIRST) / INCREASE_STEP) + 1 },
  (_unused, index) => Level.parse(INCREASE_FIRST + index * INCREASE_STEP),
);

/** A statistic as skill slots read it: its id, name and selector. */
interface StatisticFields {
  readonly id: ContentId | StatisticId;
  readonly name: ContentText;
  readonly selector: Selector;
}

/** The statistic as a skill option, when its selector is a skill's or a Lore's. */
function skillOf({ id, name, selector }: StatisticFields): SkillOption | undefined {
  return selector.startsWith(SKILL_PREFIX) ? { id: ContentId.parse(id), selector, name } : undefined;
}

/**
 * The skills and Lores of the registry's statistics, and of its packs' statistic entries (an imported Lore), one per
 * selector, the last registered, as the engine chooses; by name.
 */
function skillsOf(registry: ContentRegistry): readonly SkillOption[] {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const statistics: StatisticFields[] = [
    ...registry.statistics().map(({ id, definition: { name, selector } }) => ({ id, name, selector })),
    ...entries.flatMap((entry) =>
      entry.kind === ContentKind.Statistic ? [{ id: entry.id, name: entry.name, selector: entry.data.selector }] : [],
    ),
  ];
  const skills = statistics.flatMap((each) => skillOf(each) ?? []);
  const bySelector = new Map(skills.map((skill) => [skill.selector, skill]));
  return [...bySelector.values()].toSorted((left, right) => left.name.localeCompare(right.name));
}

/** Each class's skills, by id; Player Core's increases for a class that names none. */
function classSkillsOf(registry: ContentRegistry): ReadonlyMap<ContentId, ClassSkills> {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(
    entries.flatMap((entry): [ContentId, ClassSkills][] => {
      if (entry.kind !== ContentKind.Class) {
        return [];
      }
      const { additionalSkills, skillIncreaseLevels } = entry.data;
      return [
        [entry.id, { additional: additionalSkills, increaseLevels: skillIncreaseLevels ?? PLAYER_CORE_INCREASES }],
      ];
    }),
  );
}

/** The registry's skills and Lores, and its classes' skills. */
export function skillContent(registry: ContentRegistry): SkillContent {
  const classes = classSkillsOf(registry);
  return { skills: skillsOf(registry), classSkills: (id: ContentId): ClassSkills | undefined => classes.get(id) };
}
