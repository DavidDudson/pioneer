import { evaluate, FORMULA_VALUE_MAX, TextPosition } from '@pioneer/rules/formula';
import type { FormulaValue } from '@pioneer/rules/formula';
import type { Selector, StatisticDefinition } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { baseTerms } from './base-term';
import type { BaseTerm } from './base-term';
import type { BreakdownLine } from './breakdown';
import { EngineMessage } from './messages';
import { Components, statisticGraph } from './statistic-graph';
import type { StatisticEdge, StatisticNode } from './statistic-graph';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

/**
 * A statistic's breakdown: its base term by term, the value they add up to, every modifier that reaches it as a
 * line, and the total: the base plus the applied lines.
 */
export interface StatisticValue {
  readonly ok: true;
  readonly selector: Selector;
  readonly base: readonly BaseTerm[];
  readonly baseValue: FormulaValue;
  readonly lines: readonly BreakdownLine[];
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

/** Where a total that leaves the safe integer range points: the start of the base formula, as no line is to blame. */
const TOTAL_POSITION = TextPosition.parse(1);

/** A statistic whose applied lines add up past the safe integer range. */
export function totalOutOfRange(selector: Selector): StatisticFailure {
  const error = message(EngineMessage.TotalOutOfRange, { maximum: FORMULA_VALUE_MAX });
  return failure(selector, error, TOTAL_POSITION);
}

/** A statistic in a cycle, failing at `edge`, its reference into the cycle; `members` are named in selector order. */
function cycle(selector: Selector, edge: StatisticEdge, members: readonly Selector[]): StatisticFailure {
  const statistics = members.join(LIST_SEPARATOR);
  const params = { found: `${SIGIL}${edge.path}`, position: edge.position, statistics, count: members.length };
  return failure(selector, message(EngineMessage.StatisticCycle, params), edge.position);
}

/** A statistic's definition and its result before modifiers: a value with no lines yet, or its failure. */
export interface StatisticBase {
  readonly definition: StatisticDefinition;
  readonly result: StatisticResult;
}

/**
 * The base phase (rules-engine.md, step 5): every statistic's base from its base formula and the character's
 * inputs, evaluated component by component in dependency order, each statistic once, so the work is linear in
 * statistics and references. A cycle, a reference to a missing statistic or to one that failed, or a formula that
 * fails to evaluate is that statistic's error, pointing into its formula; the others still evaluate. Statistics
 * are visited in selector order, so nothing depends on the order of the definitions, except that a later
 * definition of a selector replaces an earlier one.
 */
export class StatisticBases {
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
    const resolve = resolverFor(this.#inputs, (read) => this.baseValue(read));
    const outcome = evaluate(formula, resolve);
    return outcome.ok
      ? {
          ok: true,
          selector,
          base: baseTerms(formula, resolve, outcome.value),
          baseValue: outcome.value,
          lines: [],
          total: outcome.value,
        }
      : failure(selector, outcome.error, outcome.position);
  }
}
