import type { RollOption } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { DEFAULT_NAMESPACES, kindOf, NamespaceKind } from './namespaces';
import type { NamespaceTable, RollOptionNamespace } from './namespaces';

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

/** One namespace replaced: the facts underneath, and the options the namespace holds instead. */
interface Layer {
  readonly base: PredicateFacts;
  /** The namespace and its separator, `item:`. */
  readonly prefix: string;
  /** Written without the namespace. */
  readonly options: readonly string[];
}

/** The numbers after `rest:` among `options`, which are written without the namespace `rest` was taken off. */
function layerValues(options: readonly string[], rest: string): OptionValue[] {
  const values: OptionValue[] = [];
  for (const option of options) {
    const split = option.lastIndexOf(SEPARATOR);
    const value = Number(option.slice(split + 1));
    if (split === rest.length && option.startsWith(rest) && Number.isFinite(value)) {
      values.push(OptionValue.parse(value));
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
  /** `isKnown` answers so far: one query asks the same of every candidate it tests. */
  readonly #known = new Map<string, boolean>();
  /** Set only by `withNamespace`, on the facts it returns. */
  #layer: Layer | undefined = undefined;

  public constructor(options: Iterable<RollOption>, namespaces: NamespaceTable = DEFAULT_NAMESPACES) {
    this.#options = new Set<string>(options);
    this.#values = indexValues(this.#options);
    this.#namespaces = namespaces;
  }

  /**
   * These facts with `namespace` holding exactly `options`, written without it (`trait:fighter` under `item` is
   * `item:trait:fighter`); whatever these facts had there is hidden. Nothing is copied, so testing many candidates
   * (each content entry a `ChoiceSet` query offers) against one character costs only the candidates themselves.
   */
  public withNamespace(namespace: RollOptionNamespace, options: readonly RollOption[]): PredicateFacts {
    const layered = new PredicateFacts([], this.#namespaces);
    layered.#layer = { base: this, prefix: `${namespace}${SEPARATOR}`, options };
    return layered;
  }

  /** Whether `option` is present. Takes plain text because comparisons build options from their operands. */
  public has(option: string): boolean {
    const layer = this.#layer;
    if (layer === undefined) {
      return this.#options.has(option);
    }
    return option.startsWith(layer.prefix)
      ? layer.options.includes(option.slice(layer.prefix.length))
      : layer.base.has(option);
  }

  /** Every number written after `prefix:` in a present option: `[5]` for `self:level` given `self:level:5`. */
  public values(prefix: RollOption): readonly OptionValue[] {
    const layer = this.#layer;
    if (layer === undefined) {
      return this.#values.get(prefix) ?? NO_VALUES;
    }
    return prefix.startsWith(layer.prefix)
      ? layerValues(layer.options, prefix.slice(layer.prefix.length))
      : layer.base.values(prefix);
  }

  /** Whether a missing `option` is false (known namespace) rather than unknown (situational). */
  public isKnown(option: RollOption): boolean {
    if (this.#layer !== undefined) {
      return this.#layer.base.isKnown(option);
    }
    const cached = this.#known.get(option);
    if (cached !== undefined) {
      return cached;
    }
    const known = kindOf(option, this.#namespaces) === NamespaceKind.Known;
    this.#known.set(option, known);
    return known;
  }
}
