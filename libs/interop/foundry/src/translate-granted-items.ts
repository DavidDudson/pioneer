import { RuleElementKey, slugName } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { resolveUuid } from './entry-references';
import type { EntryReferences } from './entry-references';
import { withDoctrineGrants } from './translate-doctrine-grants';

/**
 * The rules of an item that alter what it granted. Foundry names the granted item by the id the grant stored under its
 * flag, `{item|flags.system.itemGrants.<flag>.id}`, and alters it with `ItemAlteration` (`itemId`) or, for its inline
 * damage, `DamageAlteration` (the selector `<id>-inline-damage`). Pioneer has no ids for granted items, so the item is
 * the entry the grant resolves to: an alteration reaches it by its `slug:` roll option, and an alteration of its damage
 * is an `ItemAlteration` of its damage type or dice. Any other rule is as it was.
 */

type Fields = Readonly<Record<string, unknown>>;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const READ_START = '{item|flags.system.itemGrants.';
const READ_END = '.id}';
const INLINE_DAMAGE = '-inline-damage';

/** The slug of an entry, such as `dragon-breath-dragon-form`, by the id it resolves to. */
function slugOf(references: EntryReferences, id: ContentId): string | undefined {
  const found = [...references.bySlug].find(([, each]) => each === id);
  return found === undefined ? undefined : String(slugName(found[0]));
}

/** The entries the `GrantItem` elements among `raws` grant, by the flag they store the grant under. */
function grantedByFlag(raws: readonly unknown[], references: EntryReferences): ReadonlyMap<string, string> {
  const granted = new Map<string, string>();
  for (const raw of raws) {
    if (isFields(raw) && raw['key'] === RuleElementKey.GrantItem) {
      const { flag, uuid } = raw;
      const id = typeof uuid === 'string' ? resolveUuid(references, uuid) : undefined;
      const slug = id === undefined ? undefined : slugOf(references, id);
      if (typeof flag === 'string' && slug !== undefined) {
        granted.set(flag, slug);
      }
    }
  }
  return granted;
}

/** The flag a text reads the id of a granted item by, when the text is nothing more than that read (plus `suffix`). */
function flagOf(text: unknown, suffix = ''): string | undefined {
  const ending = `${READ_END}${suffix}`;
  if (typeof text !== 'string' || !text.startsWith(READ_START) || !text.endsWith(ending)) {
    return undefined;
  }
  return text.slice(READ_START.length, text.length - ending.length);
}

const LEVEL_PREDICATE_FIELD = 'parent:level';

/** The rank a predicate of one `gte` on `parent:level` asks for; undefined for any other predicate. */
function rankOf(predicate: unknown): number | undefined {
  if (!Array.isArray(predicate) || predicate.length !== 1) {
    return undefined;
  }
  const [statement] = predicate as readonly unknown[];
  const operands = isFields(statement) ? statement['gte'] : undefined;
  if (!Array.isArray(operands) || operands[0] !== LEVEL_PREDICATE_FIELD || typeof operands[1] !== 'number') {
    return undefined;
  }
  return operands[1];
}

/** `value` that applies from `rank` up, as a formula of the level of the item that holds the element. */
function fromRank(value: number, rank: number): string {
  return `ternary(gte(@item.level, ${rank}), ${value}, 0)`;
}

/** The slug of the granted item the `DamageAlteration` `raw` reaches by its inline damage, if it reaches one. */
function damageTarget(raw: Fields, granted: ReadonlyMap<string, string>): string | undefined {
  const { selectors } = raw;
  const [only, ...others] = Array.isArray(selectors) ? (selectors as readonly unknown[]) : [];
  const flag = others.length === 0 ? flagOf(only, INLINE_DAMAGE) : undefined;
  return flag === undefined ? undefined : granted.get(flag);
}

/** The roll option that reaches the granted item `slug`, written as a Foundry predicate statement over the item. */
function reaching(slug: string): string {
  return `item:slug:${slug}`;
}

/** `raw` with `statement` added to its predicate. */
function withStatement(raw: Fields, statement: string): Fields {
  const predicate: readonly unknown[] = Array.isArray(raw['predicate']) ? raw['predicate'] : [];
  return { ...raw, predicate: [...predicate, statement] };
}

/** A `DamageAlteration` of a granted item's inline damage as an `ItemAlteration` of the item; as it is otherwise. */
function damageAltered(raw: Fields, slug: string): Fields {
  const { selectors: _selectors, property, value, mode, predicate, ...rest } = raw;
  if (property === 'damage-type') {
    return withStatement(
      { ...rest, key: RuleElementKey.ItemAlteration, property, mode, value, predicate },
      reaching(slug),
    );
  }
  const rank = rankOf(predicate);
  const dice = typeof value === 'number' && rank !== undefined ? fromRank(value, rank) : value;
  const gate = rank === undefined ? { predicate } : {};
  return withStatement(
    { ...rest, ...gate, key: RuleElementKey.ItemAlteration, property: 'damage-dice', mode, value: dice },
    reaching(slug),
  );
}

/** An `ItemAlteration` of a granted item by `itemId` as an alteration that reaches the item by its slug. */
function itemAltered(raw: Fields, granted: ReadonlyMap<string, string>): Fields {
  const flag = flagOf(raw['itemId']);
  const slug = flag === undefined ? undefined : granted.get(flag);
  if (slug === undefined) {
    return raw;
  }
  const { itemId: _itemId, ...rest } = raw;
  return withStatement(rest, reaching(slug));
}

function altered(raw: unknown, granted: ReadonlyMap<string, string>): unknown {
  if (!isFields(raw)) {
    return raw;
  }
  if (raw['key'] === RuleElementKey.ItemAlteration) {
    return itemAltered(raw, granted);
  }
  const slug = raw['key'] === RuleElementKey.DamageAlteration ? damageTarget(raw, granted) : undefined;
  return slug === undefined ? raw : damageAltered(raw, slug);
}

/** `raws` with the alterations of the items they grant in Pioneer's spelling; the grants' flags in Pioneer's too. */
export function withGrantedItems(raws: readonly unknown[], references: EntryReferences): readonly unknown[] {
  const doctrines = withDoctrineGrants(raws, references);
  const granted = grantedByFlag(doctrines, references);
  return granted.size === 0 ? doctrines : doctrines.map((raw) => altered(raw, granted));
}
