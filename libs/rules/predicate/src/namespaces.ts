import type { RollOption } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** How to read a missing roll option in a namespace (ADR-0002). */
export const NamespaceKind = {
  /** The character's own facts. Absent means false: no `feat:shield-block` means no Shield Block. */
  Known: 'known',
  /** Facts about the moment. Absent means unknown: no `terrain:forest` may just mean nobody said. */
  Situational: 'situational',
} as const;
export type NamespaceKind = ValueOf<typeof NamespaceKind>;

/**
 * The leading words of a roll option that the table classifies: usually the first word (`self` in
 * `self:condition:frightened`), sometimes more where one namespace mixes kinds (`self:action`).
 */
export const RollOptionNamespace = z
  .string()
  .regex(/^[a-z\d](?:[a-z\d]|[-:](?=[a-z\d]))*$/u)
  .brand<'RollOptionNamespace'>();
export type RollOptionNamespace = z.infer<typeof RollOptionNamespace>;

/** Which namespaces are known. The longest listed namespace an option starts with decides; unlisted is situational. */
export type NamespaceTable = ReadonlyMap<RollOptionNamespace, NamespaceKind>;

const SEPARATOR = ':';

export function namespaceOf(option: RollOption): RollOptionNamespace {
  return RollOptionNamespace.parse(option.slice(0, option.indexOf(SEPARATOR)));
}

/** How `table` reads a missing `option`: by the longest listed namespace it starts with, else situational. */
export function kindOf(option: RollOption, table: NamespaceTable): NamespaceKind {
  for (let end = option.length; end > 0; end = option.lastIndexOf(SEPARATOR, end - 1)) {
    const kind = table.get(RollOptionNamespace.parse(option.slice(0, end)));
    if (kind !== undefined) {
      return kind;
    }
  }
  return NamespaceKind.Situational;
}

/** A table from plain entries, for tests and for packs that extend the default. */
export function namespaceTable(entries: Readonly<Record<string, NamespaceKind>>): NamespaceTable {
  return new Map(Object.entries(entries).map(([name, kind]) => [RollOptionNamespace.parse(name), kind]));
}

/** `table` with `namespaces` marked known, such as those a character's `ChoiceSet` picks write to. */
export function withKnown(table: NamespaceTable, namespaces: Iterable<RollOptionNamespace>): NamespaceTable {
  const extended = new Map(table);
  for (const namespace of namespaces) {
    extended.set(namespace, NamespaceKind.Known);
  }
  return extended;
}

/**
 * The default classification, checked against the roll options Foundry pf2e's feats, class and ancestry
 * features, conditions, effects and equipment use. Known namespaces describe the character, so the sheet
 * knows them; situational ones describe a roll, its target or the scene. Situational is also the fallback,
 * so a namespace missing from here shows as a conditional line instead of hiding a modifier.
 *
 * `item` and `parent` are known because the engine always evaluates them for a specific item (the Strike's
 * weapon, the granting feature). Inside `self`, the action being used, flanking and initiative in the current
 * encounter are situational. Namespaces a `ChoiceSet` writes (`kinetic-gate`, `werecreature`) are added
 * per character with `withKnown`.
 */
export const DEFAULT_NAMESPACES: NamespaceTable = namespaceTable({
  self: NamespaceKind.Known,
  'self:action': NamespaceKind.Situational,
  'self:flanking': NamespaceKind.Situational,
  'self:participant': NamespaceKind.Situational,
  item: NamespaceKind.Known,
  parent: NamespaceKind.Known,
  class: NamespaceKind.Known,
  feat: NamespaceKind.Known,
  feature: NamespaceKind.Known,
  ancestry: NamespaceKind.Known,
  heritage: NamespaceKind.Known,
  background: NamespaceKind.Known,
  deity: NamespaceKind.Known,
  armor: NamespaceKind.Known,
  skill: NamespaceKind.Known,
  defense: NamespaceKind.Known,
  action: NamespaceKind.Situational,
  attack: NamespaceKind.Situational,
  bonus: NamespaceKind.Situational,
  check: NamespaceKind.Situational,
  damage: NamespaceKind.Situational,
  encounter: NamespaceKind.Situational,
  inflicts: NamespaceKind.Situational,
  lighting: NamespaceKind.Situational,
  origin: NamespaceKind.Situational,
  penalty: NamespaceKind.Situational,
  proficiency: NamespaceKind.Situational,
  situation: NamespaceKind.Situational,
  spellcasting: NamespaceKind.Situational,
  target: NamespaceKind.Situational,
  terrain: NamespaceKind.Situational,
});
