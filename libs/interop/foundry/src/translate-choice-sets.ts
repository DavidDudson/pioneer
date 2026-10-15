import { ContentKind, RuleElement, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { kebab } from './foundry-flags';
import { SKILLS } from './foundry-skills';
import { namespacedStatement, withNamespacedOptions } from './translate-modifiers';

/**
 * Foundry's `ChoiceSet` in Pioneer's spelling (ADR-0008): its flag is a slug, a choice's value is text, a choice's
 * predicate and a query's filter read bare roll options as every predicate does, a query by `itemType` names a kind of
 * entry, and the `skills` config is the skills it lists. `adjustName` (renaming the item after the pick) only steers
 * Foundry's display and is dropped. What this cannot carry over (a choice whose value is an object, a query
 * of the character's items or attacks, other configs, `allowedDrops`, `actorFlag`, a `slug`, a roll option with a
 * namespace of its own) is left as it is, so the element fails and is kept for the backlog.
 */

/** Fields that only steer Foundry's display. */
const DISPLAY_ONLY_FIELDS: ReadonlySet<string> = new Set(['adjustName']);

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

/** Foundry's injection of the level of the item holding the `ChoiceSet`, which Pioneer reads as `item:level`. */
const ITEM_LEVEL = '{item|level}';
const ITEM_LEVEL_OPTION = 'item:level';

/** A predicate with each read of the item's level as Pioneer spells it; anything else is as it was. */
function withItemLevel(node: unknown): unknown {
  if (node === ITEM_LEVEL) {
    return ITEM_LEVEL_OPTION;
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
function choiceOf(choice: unknown): unknown {
  if (typeof choice !== 'object' || choice === null || !('value' in choice)) {
    return choice;
  }
  const kept = Object.entries(choice)
    .filter(([field]) => !CHOICE_DISPLAY_ONLY_FIELDS.has(field))
    .map(([field, value]) => [field, field === 'predicate' ? withItemLevel(value) : value]);
  return withNamespacedOptions({ ...Object.fromEntries(kept), value: asText(choice.value) });
}

/** An item's name as a slug, the flag Foundry gives a `ChoiceSet` that names none: `Align the Stars` is `align-the-stars`. */
function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
}

function titleCase(slug: string): string {
  return `${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

/** The skills Foundry's `skills` config lists, as choices. */
const SKILL_CHOICES: readonly unknown[] = [...SKILLS].map((skill) => ({ value: skill, label: titleCase(skill) }));

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
  const filter = choices.filter.map((statement: unknown) => namespacedStatement(statement));
  return { kind, filter };
}

function choicesOf(choices: unknown): unknown {
  if (Array.isArray(choices)) {
    return choices.map((choice) => choiceOf(choice));
  }
  if (typeof choices !== 'object' || choices === null) {
    return choices;
  }
  const isSkills = 'config' in choices && choices.config === 'skills' && Object.keys(choices).length === 1;
  return isSkills ? SKILL_CHOICES : queryOf(choices);
}

/**
 * A `ChoiceSet` as Pioneer's element: its flag a slug (without one, the item's name, as Foundry names it by the item),
 * its choices and filter as above, and the display-only fields dropped. Any other element is as it is.
 */
export function withChoiceSet(raw: unknown, item: string): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.ChoiceSet) {
    return raw;
  }
  const kept = Object.entries(raw).filter(([field]) => !DISPLAY_ONLY_FIELDS.has(field));
  const shaped = Object.fromEntries(
    kept.map(([field, value]) => [field, field === 'choices' ? choicesOf(value) : value]),
  );
  const flag = 'flag' in raw && typeof raw.flag === 'string' ? kebab(raw.flag) : slugOf(item);
  return { ...shaped, flag };
}

/** A subclass's `ChoiceSet`: Foundry queries class features by tag alone (`item:tag:cleric-doctrine`). */
const FoundryTagChoices = z.strictObject({
  filter: z.array(z.string().regex(/^item:tag:[a-z0-9-]+$/u)).min(1),
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
