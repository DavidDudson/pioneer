import { statisticContent } from '@pioneer/rules/engine';
import type { StatisticContent } from '@pioneer/rules/engine';
import {
  ContentText,
  LORE_CHOICE_PREFIX,
  LORE_NAME_MAX_LENGTH,
  LoreChoice,
  LoreText,
  loreTopicSlug,
  Selector,
  Slug,
  StatisticDefinition,
} from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import type { SkillContent, SkillOption } from './skill-content';
import { SKILL_PREFIX } from './skill-content';

/** A Lore as the player names it: `Sailing`, `Sailing Lore`. */
export const LoreName = z.string().trim().min(1).max(LORE_NAME_MAX_LENGTH).brand<'LoreName'>();
export type LoreName = z.infer<typeof LoreName>;

/** The names of a build's custom Lores, by topic (`sailing`). */
export type LoreNames = Readonly<Record<Slug, LoreName>>;

/** Every custom Lore's selector starts so: `skill:lore:sailing`. */
const LORE_SELECTOR_PREFIX = `${SKILL_PREFIX}lore:`;

/**
 * A Lore's topic from the name the player typed, less the word Lore its selector already says: `Sailing Lore` and
 * `sailing` are both `sailing`. Undefined when the name leaves no letters or digits, or a topic too long for a selector.
 */
export function loreTopicOf(name: LoreName): Slug | undefined {
  return loreTopicSlug(LoreText.parse(name));
}

/** The pick of the custom Lore on `topic`: `lore:sailing`. */
export function loreChoiceOf(topic: Slug): LoreChoice {
  return LoreChoice.parse(`${LORE_CHOICE_PREFIX}${topic}`);
}

/** The topic a pick of a custom Lore names; undefined for any other pick. */
export function loreTopicOfChoice(pick: ChoiceValue): Slug | undefined {
  const choice = LoreChoice.safeParse(pick);
  return choice.success ? Slug.safeParse(choice.data.slice(LORE_CHOICE_PREFIX.length)).data : undefined;
}

/** A Lore's selector from its topic: `skill:lore:sailing`. */
export function loreSelectorOf(topic: Slug): Selector {
  return Selector.parse(`${LORE_SELECTOR_PREFIX}${topic}`);
}

const LORE_SUFFIX = / lore$/iu;

/** The name the sheet shows for a Lore: the player's name, with the word Lore added when it has none. */
export function loreDisplayName(name: LoreName): ContentText {
  return ContentText.parse(LORE_SUFFIX.test(name) ? name : `${name} Lore`);
}

/** The skill option for the custom Lore on `topic`. */
function customLoreOption(topic: Slug, name: LoreName): SkillOption {
  return { id: loreChoiceOf(topic), selector: loreSelectorOf(topic), name: loreDisplayName(name) };
}

/** The topic and name of each custom Lore a build names. */
function entriesOf(lores: LoreNames): [Slug, LoreName][] {
  return Object.entries(lores).flatMap(([topic, name]): [Slug, LoreName][] => {
    const slug = Slug.safeParse(topic);
    return slug.success ? [[slug.data, name]] : [];
  });
}

/**
 * `content` with the custom Lores `lores` names, each a skill like a loaded one. A Lore the loaded content has a
 * statistic for keeps that statistic: it wins, and a pick of its topic names it.
 */
export function withCustomLores(content: SkillContent, lores: LoreNames): SkillContent {
  const loaded = new Map(content.skills.map((skill) => [skill.selector, skill]));
  const custom = entriesOf(lores).flatMap(([topic, name]): SkillOption[] =>
    loaded.has(loreSelectorOf(topic)) ? [] : [customLoreOption(topic, name)],
  );
  if (custom.length === 0 && Object.keys(lores).length === 0) {
    return content;
  }
  const byChoice = new Map(custom.map((skill) => [skill.id, skill]));
  return {
    ...content,
    skills: [...content.skills, ...custom].toSorted((left, right) => left.name.localeCompare(right.name)),
    skill: (pick: ChoiceValue): SkillOption | undefined => {
      const topic = loreTopicOfChoice(pick);
      if (topic === undefined) {
        return content.skill(pick);
      }
      return loaded.get(loreSelectorOf(topic)) ?? byChoice.get(loreChoiceOf(topic));
    },
  };
}

/** The Lore a document's picks name, with no name kept for it yet: its topic, as `Sailing`. */
function topicName(topic: Slug): LoreName {
  const spaced = topic.replaceAll('-', ' ').replace(/^./u, (first) => first.toUpperCase());
  return LoreName.parse(spaced.slice(0, LORE_NAME_MAX_LENGTH));
}

/** `document`'s custom Lores, and those it picks without a name kept: they read by their topic. */
export function loresOf(document: CharacterDocument): LoreNames {
  const picked = Object.values(document.build.choices).flatMap((pick) => loreTopicOfChoice(pick) ?? []);
  const unnamed = picked.filter((topic) => document.build.lores[topic] === undefined);
  return { ...document.build.lores, ...Object.fromEntries(unnamed.map((topic) => [topic, topicName(topic)])) };
}

/** `content` with the custom Lores `document` names and picks. */
export function documentSkills(document: CharacterDocument, content: SkillContent): SkillContent {
  return withCustomLores(content, loresOf(document));
}

/**
 * The statistics the engine derives for the custom Lores `document` names and picks, like a loaded Lore (Intelligence,
 * in the `skill-check` and `lore` domains), less any whose selector `loaded` already defines: a loaded statistic wins.
 */
export function customLoreStatistics(
  document: CharacterDocument,
  loaded: readonly StatisticDefinition[],
): readonly StatisticDefinition[] {
  const taken = new Set(loaded.map(({ selector }) => selector));
  return entriesOf(loresOf(document)).flatMap(([topic, name]): StatisticDefinition[] => {
    const selector = loreSelectorOf(topic);
    return taken.has(selector)
      ? []
      : [
          StatisticDefinition.parse({
            slug: `statistic:${topic}-lore`,
            name: loreDisplayName(name),
            selector,
            domains: ['check', 'skill-check', 'int-based', 'lore'],
            base: `@attr.int + @prof.skill.lore.${topic}`,
            kind: 'check',
            keyAttribute: 'int',
          }),
        ];
  });
}

/** What a pick of a custom Lore comes with: its name from the player, when it gave one. */
interface LorePick {
  readonly selection?: ChoiceValue;
  readonly loreName?: LoreName | undefined;
}

/** `document` with the name the player gave the custom Lore `pick` names; unchanged for any other pick. */
export function withPickedLore(document: CharacterDocument, { selection, loreName }: LorePick): CharacterDocument {
  const topic = selection === undefined ? undefined : loreTopicOfChoice(selection);
  if (topic === undefined) {
    return document;
  }
  const name = loreName ?? document.build.lores[topic] ?? topicName(topic);
  return { ...document, build: { ...document.build, lores: { ...document.build.lores, [topic]: name } } };
}

/**
 * `document` after an edit of a slot: with the name the player gave the custom Lore `pick` names, when it names one, and
 * without the names of Lores no pick names any more.
 */
export function withLoreEdit(document: CharacterDocument, pick: LorePick = {}): CharacterDocument {
  return withoutUnpickedLores(pick.selection === undefined ? document : withPickedLore(document, pick));
}

/** `document` with the names of custom Lores no pick names any more dropped, so the build keeps only the Lores it has. */
export function withoutUnpickedLores(document: CharacterDocument): CharacterDocument {
  const picked = new Set(Object.values(document.build.choices).flatMap((pick) => loreTopicOfChoice(pick) ?? []));
  const lores = Object.fromEntries(entriesOf(document.build.lores).filter(([topic]) => picked.has(topic)));
  return Object.keys(lores).length === Object.keys(document.build.lores).length
    ? document
    : { ...document, build: { ...document.build, lores } };
}

/** A statistic content read, which may be none. */
interface StatisticContentRead {
  readonly content: StatisticContent | undefined;
}

/** Statistic content already read, by registry and document: neither is ever changed in place. */
const STATISTIC_CONTENT = new WeakMap<ContentRegistry, WeakMap<CharacterDocument, StatisticContentRead>>();

/**
 * The statistics the registry defines, with those of the custom Lores the character names (#572): derived like a loaded
 * Lore, and left out for one a loaded statistic has the selector of. Undefined without a proficiency bonus table.
 */
export function characterStatisticContent(
  registry: ContentRegistry,
  document: CharacterDocument,
): StatisticContent | undefined {
  const byDocument = STATISTIC_CONTENT.get(registry) ?? new WeakMap<CharacterDocument, StatisticContentRead>();
  STATISTIC_CONTENT.set(registry, byDocument);
  const known = byDocument.get(document);
  if (known !== undefined) {
    return known.content;
  }
  const content = statisticContent(registry);
  const read: StatisticContentRead = {
    content:
      content === undefined
        ? undefined
        : { ...content, definitions: [...content.definitions, ...customLoreStatistics(document, content.definitions)] },
  };
  byDocument.set(document, read);
  return read.content;
}

/** A Lore the player typed into a skill picker, before it is a pick: its name after `lore:`, as in `lore:Sailing`. */
export const TypedLore = z
  .string()
  .startsWith(LORE_CHOICE_PREFIX)
  .max(LORE_CHOICE_PREFIX.length + LORE_NAME_MAX_LENGTH)
  .brand<'TypedLore'>();
export type TypedLore = z.infer<typeof TypedLore>;

/** What a typed Lore comes to: the pick of its topic and the name the player gave it. */
export interface LoreSelection {
  readonly selection: LoreChoice;
  readonly loreName: LoreName;
}

/** The pick and name a typed Lore stands for; undefined when its name is empty or leaves no topic. */
export function loreSelectionOf(typed: TypedLore): LoreSelection | undefined {
  const name = LoreName.safeParse(typed.slice(LORE_CHOICE_PREFIX.length));
  const topic = name.success ? loreTopicOf(name.data) : undefined;
  return name.success && topic !== undefined ? { selection: loreChoiceOf(topic), loreName: name.data } : undefined;
}
