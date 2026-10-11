import type { GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { Level, Proficiency, RollOption, RuleElementKey, RuleIndex } from '@pioneer/rules/sdk';
import type { ContentId, ContentText, LanguageElement, Predicate, Selector } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import type { LanguageContent } from './language-content';
import { grantedSkillRanks, skillSlots, slotSkillRanks, withSkillPicks } from './skill-training';
import type { SkillReads } from './skill-training';

/** A feature whose `Language` element opened or granted something: the entry and its name. */
export interface LanguageFeature {
  readonly entry: ContentId;
  readonly name: ContentText;
}

/** A `Language` element on an entry the character has, and where it sits in the entry's rules. */
interface PlacedElement {
  readonly feature: LanguageFeature;
  readonly rule: RuleIndex;
  readonly element: LanguageElement;
}

/** What the character is at one level, as `Language` elements read it. */
export interface LevelRead {
  readonly level: Level;
  readonly elements: readonly PlacedElement[];
  readonly holds: (predicate: Predicate | undefined) => boolean;
}

/** What language slots are read with: the languages content, how namespaces read, and the skill slots' reads. */
export interface LanguageReads {
  readonly languages: LanguageContent;
  readonly namespaces: NamespaceTable;
  readonly skills: SkillReads;
}

const RANKS: readonly Proficiency[] = Object.values(Proficiency);

function levels(): Level[] {
  const count = CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + 1;
  return Array.from({ length: count }, (_unused, index) => Level.parse(CHARACTER_LEVEL_MIN + index));
}

/** The `Language` elements of every entry on the character in `resolution`. */
function languageElements({ items }: GrantResolution): PlacedElement[] {
  return items.flatMap(({ entry }) =>
    entry.rules.flatMap((element, index): PlacedElement[] =>
      element.key === RuleElementKey.Language
        ? [{ feature: { entry: entry.id, name: entry.name }, rule: RuleIndex.parse(index), element }]
        : [],
    ),
  );
}

/** `skill:society:rank:3` for each skill rank, as Foundry writes them: untrained 0 to legendary 4. */
function rankOptions(ranks: ReadonlyMap<Selector, Proficiency>): RollOption[] {
  return [...ranks].map(([selector, rank]) => RollOption.parse(`${selector}:rank:${RANKS.indexOf(rank)}`));
}

/**
 * The character at each level from 1st to 20th: the `Language` elements of what it has there, and whether a predicate
 * holds over its roll options and its skill ranks there (`skill:society:rank:3`), its skill picks up to that level
 * included.
 */
export function levelReads(document: CharacterDocument, reads: LanguageReads): readonly LevelRead[] {
  const skills = skillSlots(document, reads.skills);
  return levels().map((level) => {
    const resolution = reads.skills.grantsAt(level);
    const ranks = withSkillPicks(grantedSkillRanks(resolution), slotSkillRanks(skills, level));
    const facts = new PredicateFacts([...resolution.rollOptions, ...rankOptions(ranks)], reads.namespaces);
    const holds = (predicate: Predicate | undefined): boolean =>
      predicate === undefined || evaluatePredicate(predicate, facts) === Truth.True;
    return { level, elements: languageElements(resolution), holds };
  });
}
