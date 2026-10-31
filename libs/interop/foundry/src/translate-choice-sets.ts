import { ContentKind, RuleElement, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveUuid } from './entry-references';
import type { EntryReferences } from './entry-references';
import { kebab, slugOf } from './foundry-flags';
import { namespacedStatement, withNamespacedOptions } from './translate-modifiers';
import { ownedQueryOf } from './translate-owned-picks';
import { SKILL_CHOICES, skillChoicesWhere } from './translate-skill-choices';

/**
 * Foundry's `ChoiceSet` in Pioneer's spelling (ADR-0008): its flag is a slug, a choice's value is text, a choice's
 * predicate and a query's filter read bare roll options as every predicate does, a query by `itemType` names a kind of
 * entry, and the `skills`, `ranks` and `baseWeaponTypes` configs are the skills, ranks and weapons they list. `adjustName` (renaming the item after the pick) only steers
 * Foundry's display and is dropped. What this cannot carry over (a choice whose value is an object, a query
 * of the character's items or attacks, other configs, `allowedDrops`, `actorFlag`, a `slug`, a roll option with a
 * namespace of its own) is left as it is, so the element fails and is kept for the backlog.
 */

/** Foundry's `allowNoSelection` (the pick may be left empty), which Pioneer spells `optional`. */
const NO_SELECTION_FIELD = 'allowNoSelection';

/** Fields that only steer Foundry's display, or the order it applies the rule in. */
const DISPLAY_ONLY_FIELDS: ReadonlySet<string> = new Set(['adjustName', 'priority']);

/** The kinds a query by Foundry's `itemType` can name. */
const QUERY_KINDS: ReadonlyMap<string, ContentKind> = new Map([
  ['action', ContentKind.Action],
  ['ancestry', ContentKind.Ancestry],
  ['feat', ContentKind.Feat],
  ['heritage', ContentKind.Heritage],
  ['shield', ContentKind.Shield],
  ['spell', ContentKind.Spell],
  ['weapon', ContentKind.Weapon],
]);

/** The fields of a query by Foundry's `itemType`; `slugsAsValues` (picks stored as slugs, not ids) is not among them. */
const FOUNDRY_QUERY_FIELDS: ReadonlySet<string> = new Set(['itemType', 'filter']);

/** A choice's fields that only steer Foundry's display: its icon. */
const CHOICE_DISPLAY_ONLY_FIELDS: ReadonlySet<string> = new Set(['img']);

function asText(value: unknown): unknown {
  return typeof value === 'number' ? String(value) : value;
}

/** A compendium UUID by name, which a choice names an entry by: `Compendium.pf2e.equipment-srd.Item.Soulheart`. */
const COMPENDIUM_UUID = /^Compendium\.pf2e\.[a-z-]+\.Item\.(?<name>.+)$/u;

/** A Foundry document id, which says nothing of the entry's name. */
const DOCUMENT_ID = /^[A-Za-z\d]{16}$/u;

/**
 * A choice that names an entry by compendium UUID, as the entry it resolves to. Foundry labels it with the entry's
 * name, the last part of a UUID by name; a UUID by id, or one that does not resolve, is left as it is.
 */
function withChosenEntry(choice: object, references: EntryReferences): object {
  if (!('value' in choice) || typeof choice.value !== 'string') {
    return choice;
  }
  const name = COMPENDIUM_UUID.exec(choice.value)?.groups?.['name'];
  const id = resolveUuid(references, choice.value);
  if (name === undefined || id === undefined || DOCUMENT_ID.test(name)) {
    return choice;
  }
  return {
    ...choice,
    value: id,
    label: 'label' in choice ? choice.label : name,
  };
}

/** Foundry's injection of the level of the item holding the `ChoiceSet`, which Pioneer reads as `item:level`. */
const ITEM_LEVEL = '{item|level}';
const ITEM_LEVEL_OPTION = 'item:level';

/**
 * Foundry's read of the level of what granted the item holding the `ChoiceSet`: a class feature's granter is the class,
 * whose level is the character's, which Pioneer reads as `self:level`.
 */
const GRANTER_LEVEL = 'parent:granter:level';
const GRANTER_LEVEL_OPTION = 'self:level';

/** A predicate with each read of the item's level, or of its granter's, as Pioneer spells it; anything else is as it was. */
function withItemLevel(node: unknown): unknown {
  if (node === ITEM_LEVEL) {
    return ITEM_LEVEL_OPTION;
  }
  if (node === GRANTER_LEVEL) {
    return GRANTER_LEVEL_OPTION;
  }
  if (Array.isArray(node)) {
    return node.map((each: unknown) => withItemLevel(each));
  }
  if (typeof node === 'object' && node !== null) {
    return Object.fromEntries(Object.entries(node).map(([field, value]) => [field, withItemLevel(value)]));
  }
  return node;
}

/** A choice with its value as text and its predicate's roll options namespaced, and `{item|level}` read as `item:level`. */
function choiceOf(choice: unknown, references: EntryReferences): unknown {
  if (typeof choice !== 'object' || choice === null || !('value' in choice)) {
    return choice;
  }
  const kept = Object.entries(choice)
    .filter(([field]) => !CHOICE_DISPLAY_ONLY_FIELDS.has(field))
    .map(([field, value]): [string, unknown] => [field, field === 'predicate' ? withItemLevel(value) : value]);
  const fields: Record<string, unknown> = Object.fromEntries(kept);
  return withNamespacedOptions(withChosenEntry({ ...fields, value: asText(choice.value) }, references));
}

/** Foundry's `ranks` config: ranks one to ten, valued as their number. */
const RANK_CHOICES: readonly unknown[] = Array.from({ length: 10 }, (_unused, index) => ({
  value: String(index + 1),
  label: `Rank ${index + 1}`,
}));

/**
 * Foundry's `baseWeaponTypes` config lists every base weapon (369), more than a list of choices holds, so it is a
 * query of every weapon: the pick is the weapon's slug, which is its base.
 */
const BASE_WEAPON_QUERY = { kind: ContentKind.Weapon, filter: [] };

/** What each `config` choice Pioneer has a meaning for offers. */
const CONFIG_CHOICES: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ['skills', SKILL_CHOICES],
  ['ranks', RANK_CHOICES],
  ['baseWeaponTypes', BASE_WEAPON_QUERY],
]);

/** A roll option of a class feature tag, which a subclass query filters on. */
const TAG_STATEMENT = /^item:tag:[a-z0-9-]+$/u;

/** A query by `itemType` as a query of that kind; a query that reads anything else is as it is. */
function queryOf(choices: object): unknown {
  const fields = Object.keys(choices);
  const isQuery = fields.every((field) => FOUNDRY_QUERY_FIELDS.has(field)) && 'itemType' in choices;
  if (!isQuery || typeof choices.itemType !== 'string' || !('filter' in choices) || !Array.isArray(choices.filter)) {
    return choices;
  }
  const kind = QUERY_KINDS.get(choices.itemType);
  if (kind === undefined) {
    return choices;
  }
  const filter = choices.filter.map((statement: unknown) => withItemLevel(namespacedStatement(statement)));
  // Foundry files class features under the `feat` item type: a query on class feature tags alone is of those.
  const byTagAlone =
    filter.length > 0 && filter.every((statement) => typeof statement === 'string' && TAG_STATEMENT.test(statement));
  return {
    kind: kind === ContentKind.Feat && byTagAlone ? ContentKind.ClassFeature : kind,
    filter,
  };
}

function choicesOf(choices: unknown, references: EntryReferences): unknown {
  if (Array.isArray(choices)) {
    return choices.map((choice) => choiceOf(choice, references));
  }
  if (typeof choices !== 'object' || choices === null) {
    return choices;
  }
  const fields = Object.keys(choices);
  const isSkills =
    'config' in choices &&
    choices.config === 'skills' &&
    fields.every((field) => field === 'config' || field === 'predicate');
  if (isSkills && 'predicate' in choices) {
    return skillChoicesWhere(choices.predicate).map((choice) => choiceOf(choice, references));
  }
  const configured =
    'config' in choices && typeof choices.config === 'string' && fields.length === 1
      ? CONFIG_CHOICES.get(choices.config)
      : undefined;
  const owned = ownedQueryOf(choices, (statement) => withItemLevel(namespacedStatement(statement)));
  return configured ?? (owned === choices ? queryOf(choices) : owned);
}

/**
 * A `ChoiceSet` as Pioneer's element: its flag a slug (without one, the item's name, as Foundry names it by the item),
 * its choices and filter as above, and the display-only fields dropped. Any other element is as it is.
 */
export function withChoiceSet(raw: unknown, item: string, references: EntryReferences): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.ChoiceSet) {
    return raw;
  }
  const kept = Object.entries(raw).filter(([field]) => !DISPLAY_ONLY_FIELDS.has(field));
  const shaped = Object.fromEntries(
    kept.flatMap(([field, value]) => {
      if (field === NO_SELECTION_FIELD) {
        return value === true ? [['optional', true]] : [];
      }
      return [[field, field === 'choices' ? choicesOf(value, references) : value]];
    }),
  );
  const flag = 'flag' in raw && typeof raw.flag === 'string' ? kebab(raw.flag) : slugOf(item);
  return { ...shaped, flag };
}

const TAG = /^item:tag:[a-z0-9-]+$/u;

/**
 * A subclass's `ChoiceSet`: Foundry queries class features by tag (`item:tag:cleric-doctrine`), and a dedication's also
 * leaves out the class archetypes' own (`{ not: 'item:tag:class-archetype' }`). `slugsAsValues` only steers how Foundry
 * stores the pick, which Pioneer names by its slug when it sets the pick's roll option.
 */
const TagStatement = z.union([z.string().regex(TAG), z.strictObject({ not: z.string().regex(TAG) })]);

const FoundryTagChoices = z
  .strictObject({
    filter: z.array(TagStatement).min(1),
    slugsAsValues: z.literal(true).optional(),
  })
  .check((choices) => {
    if (!choices.value.filter.some((statement) => typeof statement === 'string')) {
      choices.issues.push({
        code: 'custom',
        message: 'a tag query names a tag',
        input: choices.value,
      });
    }
  });

/** The fields a subclass query replaces (`flag`, `choices`) or drops (`adjustName`). */
const TAG_QUERY_FIELDS_REPLACED: ReadonlySet<string> = new Set(['adjustName', 'choices', 'flag']);

/**
 * A subclass's `ChoiceSet` (a doctrine, muse, order, school), which Foundry writes as a filter on class-feature tags
 * with no item type, as a query of class features. Its camel-case flag becomes a slug, and `adjustName` (renaming the
 * feature after the pick) is dropped as a display concern. Any other `ChoiceSet` is left as it is.
 */
export function withTagQuery(raw: unknown): unknown {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('key' in raw) ||
    raw.key !== RuleElementKey.ChoiceSet ||
    !('choices' in raw)
  ) {
    return raw;
  }
  const choices = FoundryTagChoices.safeParse(raw.choices);
  if (!choices.success) {
    return raw;
  }
  const kept = Object.entries(raw).filter(([field]) => !TAG_QUERY_FIELDS_REPLACED.has(field));
  const flag = 'flag' in raw && typeof raw.flag === 'string' ? { flag: kebab(raw.flag) } : {};
  const query = { kind: ContentKind.ClassFeature, filter: choices.data.filter };
  return { ...Object.fromEntries(kept), ...flag, choices: query };
}

/**
 * Whether `element` is a `ChoiceSet` that only `withChoiceSet` made translatable, with no roll option for its pick and
 * no element reading it: a pick that asks the player for nothing, so it stays in the backlog with the rules that would
 * read it.
 */
export function isUnread(element: RuleElement, plain: unknown, reads: (flag: string) => boolean): boolean {
  if (element.key !== RuleElementKey.ChoiceSet || element.rollOption !== undefined) {
    return false;
  }
  return !RuleElement.safeParse(plain).success && !reads(String(element.flag));
}

/** The flag a raw `ChoiceSet` stores its pick under, as Foundry writes it; none for any other element or a flag it lacks. */
export function foundryFlagOf(raw: unknown): string | undefined {
  const isChoiceSet = typeof raw === 'object' && raw !== null && 'key' in raw && raw.key === RuleElementKey.ChoiceSet;
  return isChoiceSet && 'flag' in raw && typeof raw.flag === 'string' ? raw.flag : undefined;
}

const PICK_READ = /rulesSelections\.(?<flag>[A-Za-z0-9]+)/gu;

/** Whether `raw` reads the pick of `flag` (`{item|flags.system.rulesSelections.<flag>}`, `@item.flags.pf2e.rulesSelections.<flag>`). */
export function readsPick(raw: unknown, flag: string): boolean {
  return [...JSON.stringify(raw).matchAll(PICK_READ)].some((found) => found.groups?.['flag'] === flag);
}

export { withChoiceObjects } from './translate-choice-objects';
export { withChoiceValues } from './translate-choice-values';
