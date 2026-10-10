import { NamespaceKind, RollOptionNamespace } from '@pioneer/rules/sdk';
import type { RollOption } from '@pioneer/rules/sdk';

/**
 * Which namespaces are known. The longest listed namespace an option starts with decides; unlisted is situational.
 * Packs list them (the core rules pack holds Foundry's), and `ContentRegistry.rollOptionNamespaces` merges them.
 */
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

/** A table from plain entries, for tests. */
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
