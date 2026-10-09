import type { RollOption } from '@pioneer/rules/sdk';
import { z } from 'zod';

import { DEFAULT_NAMESPACES, kindOf, NamespaceKind } from './namespaces';
import type { NamespaceTable } from './namespaces';

/** The number at the end of a roll option, `5` in `self:level:5`, as Foundry reads it with `Number`. */
export const OptionValue = z.number().brand<'OptionValue'>();
export type OptionValue = z.infer<typeof OptionValue>;

const SEPARATOR = ':';
const NO_VALUES: readonly OptionValue[] = [];

/**
 * Each option's number, if its last word is a finite one, grouped by the text before it: `self:level` → `[5]`.
 * `1e309` reads as Infinity, which no level or rank reaches, so it gives no value.
 */
function indexValues(options: Iterable<string>): ReadonlyMap<string, readonly OptionValue[]> {
  const values = new Map<string, OptionValue[]>();
  for (const option of options) {
    const split = option.lastIndexOf(SEPARATOR);
    const value = Number(option.slice(split + 1));
    if (Number.isFinite(value)) {
      const prefix = option.slice(0, split);
      const list = values.get(prefix) ?? [];
      list.push(OptionValue.parse(value));
      values.set(prefix, list);
    }
  }
  return values;
}

/**
 * What a predicate is tested against: the roll options that are present, and which namespaces are known.
 * Built once per derivation and shared by every predicate, so numeric suffixes are indexed up front.
 */
export class PredicateFacts {
  readonly #options: ReadonlySet<string>;
  readonly #values: ReadonlyMap<string, readonly OptionValue[]>;
  readonly #namespaces: NamespaceTable;

  public constructor(options: Iterable<RollOption>, namespaces: NamespaceTable = DEFAULT_NAMESPACES) {
    this.#options = new Set<string>(options);
    this.#values = indexValues(this.#options);
    this.#namespaces = namespaces;
  }

  /** Whether `option` is present. Takes plain text because comparisons build options from their operands. */
  public has(option: string): boolean {
    return this.#options.has(option);
  }

  /** Every number written after `prefix:` in a present option: `[5]` for `self:level` given `self:level:5`. */
  public values(prefix: RollOption): readonly OptionValue[] {
    return this.#values.get(prefix) ?? NO_VALUES;
  }

  /** Whether a missing `option` is false (known namespace) rather than unknown (situational). */
  public isKnown(option: RollOption): boolean {
    return kindOf(option, this.#namespaces) === NamespaceKind.Known;
  }
}
