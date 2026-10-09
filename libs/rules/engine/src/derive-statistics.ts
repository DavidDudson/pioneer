import { evaluate } from '@pioneer/rules/formula';
import type { FormulaValue, TextPosition } from '@pioneer/rules/formula';
import type { Selector, StatisticDefinition } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { baseTerms } from './base-term';
import type { BaseTerm } from './base-term';
import { EngineMessage } from './messages';
import { Components, statisticGraph } from './statistic-graph';
import type { StatisticEdge, StatisticNode } from './statistic-graph';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

/** A statistic's value: its base, term by term, and its total. Modifiers join the total in a later phase. */
export interface StatisticValue {
  readonly ok: true;
  readonly selector: Selector;
  readonly base: readonly BaseTerm[];
  readonly total: FormulaValue;
}

/** Why a statistic has no value, pointing into its base formula. */
export interface StatisticFailure {
  readonly ok: false;
  readonly selector: Selector;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

export type StatisticResult = StatisticValue | StatisticFailure;

const SIGIL = '@';
const LIST_SEPARATOR = ', ';

function failure(selector: Selector, error: MessageDescriptor, position: TextPosition): StatisticFailure {
  return { ok: false, selector, error, position };
}

/** A statistic in a cycle, failing at `edge`, its reference into the cycle; `members` are named in selector order. */
function cycle(selector: Selector, edge: StatisticEdge, members: readonly Selector[]): StatisticFailure {
  const params = { found: `${SIGIL}${edge.path}`, position: edge.position, statistics: members.join(LIST_SEPARATOR) };
  return failure(selector, message(EngineMessage.StatisticCycle, params), edge.position);
}

/** Evaluates the statistic graph component by component, each statistic once, keeping every result. */
class Derivation {
  readonly #graph: ReadonlyMap<Selector, StatisticNode>;
  readonly #inputs: StatisticInputs;
  readonly #results = new Map<Selector, StatisticResult>();

  public constructor(definitions: readonly StatisticDefinition[], inputs: StatisticInputs) {
    this.#graph = statisticGraph(definitions);
    this.#inputs = inputs;
    for (const component of new Components(this.#graph).inOrder) {
      this.#evaluateComponent(component);
    }
  }

  /** Every result in selector order. */
  public get results(): ReadonlyMap<Selector, StatisticResult> {
    return new Map(
      [...this.#graph.keys()].flatMap((selector) => {
        const result = this.#results.get(selector);
        return result === undefined ? [] : [[selector, result] as const];
      }),
    );
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
      const params = { found: `${SIGIL}${edge.path}`, position: edge.position, selector: edge.selector };
      if (!this.#graph.has(edge.selector)) {
        return failure(selector, message(EngineMessage.MissingStatistic, params), edge.position);
      }
      if (this.#results.get(edge.selector)?.ok !== true) {
        return failure(selector, message(EngineMessage.FailedDependency, params), edge.position);
      }
    }
    return undefined;
  }

  #evaluate(selector: Selector, { formula, edges }: StatisticNode): StatisticResult {
    if ('ok' in formula) {
      return failure(selector, formula.error, formula.position);
    }
    const blocked = this.#dependencyFailure(selector, edges);
    if (blocked !== undefined) {
      return blocked;
    }
    const resolve = resolverFor(this.#inputs, (read) => {
      const result = this.#results.get(read);
      return result?.ok === true ? result.total : undefined;
    });
    const outcome = evaluate(formula, resolve);
    return outcome.ok
      ? { ok: true, selector, base: baseTerms(formula, resolve, outcome.value), total: outcome.value }
      : failure(selector, outcome.error, outcome.position);
  }
}

/**
 * Every statistic's base value from its base formula and the character's inputs (rules-engine.md, step 5).
 * Statistics are evaluated in dependency order, each once, so the work is linear in statistics and references.
 * A cycle, a reference to a missing statistic, a reference to one that failed, or a formula that fails to evaluate
 * is that statistic's error, pointing into its formula; the others still evaluate. Never throws. The result does
 * not depend on the definitions' order, except that a later definition of a selector replaces an earlier one.
 */
export function deriveStatistics(
  definitions: readonly StatisticDefinition[],
  inputs: StatisticInputs,
): ReadonlyMap<Selector, StatisticResult> {
  return new Derivation(definitions, inputs).results;
}
