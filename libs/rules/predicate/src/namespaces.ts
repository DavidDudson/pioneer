import type { RollOption } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

/** How to read a missing roll option in a namespace (ADR-0002). */
export const NamespaceKind = {
  /** The character's own facts. Absent means false: no `feat:shield-block` means no Shield Block. */
  Known: 'known',
  /** Facts about the moment. Absent means unknown: no `terrain:forest` may just mean nobody said. */
  Situational: 'situational',
} as const;
export type NamespaceKind = ValueOf<typeof NamespaceKind>;

/** The first word of a roll option: `self` in `self:condition:frightened`. */
export const RollOptionNamespace = z
  .string()
  .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/u)
  .brand<'RollOptionNamespace'>();
export type RollOptionNamespace = z.infer<typeof RollOptionNamespace>;

/** Which namespaces are known. Anything not listed is situational. */
export type NamespaceTable = ReadonlyMap<RollOptionNamespace, NamespaceKind>;

const SEPARATOR = ':';

export function namespaceOf(option: RollOption): RollOptionNamespace {
  return RollOptionNamespace.parse(option.slice(0, option.indexOf(SEPARATOR)));
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
 * weapon, the granting feature). Namespaces a `ChoiceSet` writes (`kinetic-gate`, `werecreature`) are added
 * per character with `withKnown`.
 */
export const DEFAULT_NAMESPACES: NamespaceTable = namespaceTable({
  self: NamespaceKind.Known,
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
