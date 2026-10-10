import { evaluate, references } from '@pioneer/rules/formula';
import type { FormulaNode, FormulaValue, ResolveReference } from '@pioneer/rules/formula';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { knownReference } from '@pioneer/rules/sdk';
import type { Selector, StatisticDefinition } from '@pioneer/rules/sdk';

import { baseTerms } from './base-term';
import { applyChanges } from './change';
import type { ChangeSource } from './change';
import { EngineMessage } from './messages';
import type { RuleContext } from './rule-value';
import { Components, statisticGraph } from './statistic-graph';
import type { StatisticEdge, StatisticNode } from './statistic-graph';
import { missingInput, resolverFor } from './statistic-inputs';
import type { CharacterValues } from './statistic-inputs';
import { cycle, failure, unchosen, unreadable } from './statistic-result';
import type { StatisticFailure, StatisticResult } from './statistic-result';

/** The base phase's `Change`s by selector, and the roll options their predicates read. */
export interface BaseChanges {
  readonly changes: ReadonlyMap<Selector, readonly ChangeSource[]>;
  readonly facts: PredicateFacts;
}

/** A statistic's definition and its result before modifiers: a value with no lines yet, or its failure. */
export interface StatisticBase {
  readonly definition: StatisticDefinition;
  readonly result: StatisticResult;
}

/**
 * The base phase (rules-engine.md, step 5): every statistic's base from its base formula and the character's
 * inputs, evaluated component by component in dependency order, each statistic once, so the work is linear in
 * statistics and references. A cycle, a reference to a missing statistic or to one that failed, a reference to an
 * ancestry or class not chosen yet, or a formula that fails to evaluate is that statistic's error, pointing into its
 * formula; the others still evaluate. Statistics are visited in selector order, so nothing depends on the order of
 * the definitions, except that a later definition of a selector replaces an earlier one.
 */
export class StatisticBases {
  readonly #graph: ReadonlyMap<Selector, StatisticNode>;
  readonly #values: CharacterValues;
  readonly #changes: ReadonlyMap<Selector, readonly ChangeSource[]>;
  readonly #context: RuleContext;
  readonly #results = new Map<Selector, StatisticResult>();

  /**
   * `changes` run on each statistic's formula value to give its base. Their formulas read the inputs and the
   * level of the item they are on, not other statistics, so they add no edges to the graph.
   */
  public constructor(
    definitions: readonly StatisticDefinition[],
    values: CharacterValues,
    { changes, facts }: BaseChanges,
  ) {
    this.#graph = statisticGraph(definitions);
    this.#values = values;
    this.#changes = changes;
    this.#context = {
      facts,
      resolve: (itemLevel): ResolveReference => resolverFor(values, (): undefined => undefined, itemLevel),
    };
    for (const component of new Components(this.#graph).inOrder) {
      this.#evaluateComponent(component);
    }
  }

  /** Each statistic's definition and base result, in selector order. */
  public get bases(): readonly StatisticBase[] {
    return [...this.#graph].flatMap(([selector, { definition }]) => {
      const result = this.#results.get(selector);
      return result === undefined ? [] : [{ definition, result }];
    });
  }

  /** What `@stat.<selector>` reads: the statistic's base, so modifiers never depend on other modifiers. */
  public baseValue(selector: Selector): FormulaValue | undefined {
    const result = this.#results.get(selector);
    return result?.ok === true ? result.baseValue : undefined;
  }

  /**
   * A component that reads itself is a cycle: each member fails at its first reference into the cycle, which for
   * the last statistic reached is the one that closes it. Otherwise it is one statistic, evaluated.
   */
  #evaluateComponent(members: readonly Selector[]): void {
    const inCycle = new Set(members);
    for (const selector of members) {
      const node = this.#graph.get(selector);
      const closing = node?.edges.find((edge) => inCycle.has(edge.selector));
      if (closing !== undefined) {
        this.#results.set(selector, cycle(selector, closing, members));
      } else if (node !== undefined) {
        this.#results.set(selector, this.#evaluate(selector, node));
      }
    }
  }

  /** Why a statistic this one reads leaves it without a value, checked in the order the references are written. */
  #dependencyFailure(selector: Selector, edges: readonly StatisticEdge[]): StatisticFailure | undefined {
    for (const edge of edges) {
      if (!this.#graph.has(edge.selector)) {
        return unreadable(selector, edge, EngineMessage.MissingStatistic);
      }
      if (this.#results.get(edge.selector)?.ok !== true) {
        return unreadable(selector, edge, EngineMessage.FailedDependency);
      }
    }
    return undefined;
  }

  /** The first reference, in the order written, to an ancestry or class the character has not chosen yet. */
  #inputFailure(selector: Selector, formula: FormulaNode): StatisticFailure | undefined {
    for (const written of references(formula)) {
      const reference = knownReference(written.path);
      const missing = reference === undefined ? undefined : missingInput(reference, this.#values.inputs);
      if (missing !== undefined) {
        return unchosen(selector, written, missing);
      }
    }
    return undefined;
  }

  #evaluate(selector: Selector, { formula, edges }: StatisticNode): StatisticResult {
    if ('ok' in formula) {
      return failure(selector, formula.error, formula.position);
    }
    const blocked = this.#dependencyFailure(selector, edges) ?? this.#inputFailure(selector, formula);
    if (blocked !== undefined) {
      return blocked;
    }
    const resolve = resolverFor(this.#values, (read) => this.baseValue(read));
    const outcome = evaluate(formula, resolve);
    if (!outcome.ok) {
      return failure(selector, outcome.error, outcome.position);
    }
    const changed = applyChanges(outcome.value, this.#changes.get(selector) ?? [], this.#context);
    return {
      ok: true,
      selector,
      base: baseTerms(formula, resolve, { total: outcome.value, proficiencyOrigin: this.#values.proficiency.origin }),
      formulaValue: outcome.value,
      baseValue: changed.value,
      lines: [],
      computed: changed.value,
      total: changed.value,
      overrides: changed.lines,
      pinnedBy: undefined,
    };
  }
}
