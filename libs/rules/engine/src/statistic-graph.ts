import { FormulaText, parseFormula, references } from '@pioneer/rules/formula';
import type { FormulaNode, ParseFailure, ReferencePath, TextPosition } from '@pioneer/rules/formula';
import { knownReference, ReferenceKind } from '@pioneer/rules/sdk';
import type { Selector, StatisticDefinition } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { SourceInputs } from './source-inputs';
import type { StatisticInstance } from './statistic-instances';

/**
 * A `@stat.<selector>` reference in a base formula: the statistic it reads (in an instance, perhaps its sibling for the
 * same source), and where it is written.
 */
export interface StatisticEdge {
  readonly path: ReferencePath;
  readonly selector: Selector;
  readonly position: TextPosition;
}

/** A statistic in the graph: its definition, its parsed base formula, and the statistics that formula reads. */
export interface StatisticNode {
  readonly definition: StatisticDefinition;
  /** The weapon or spellcasting entry an instance is derived for. */
  readonly source: SourceInputs | undefined;
  /** The statistic a `@stat.<selector>` in the formula reads (`StatisticInstance#reads`). */
  readonly reads: (selector: Selector) => Selector;
  /** The parsed base, or why it does not parse (a definition built without its schema). */
  readonly formula: FormulaNode | ParseFailure;
  /** Every `@stat.<selector>` reference in the order written. Proficiency and rank references read inputs. */
  readonly edges: readonly StatisticEdge[];
}

function edgesOf(formula: FormulaNode, reads: (selector: Selector) => Selector): StatisticEdge[] {
  return references(formula).flatMap(({ path, position }) => {
    const reference = knownReference(path);
    return reference?.kind === ReferenceKind.Statistic ? [{ path, selector: reads(reference.selector), position }] : [];
  });
}

function nodeOf({ definition, source, reads }: StatisticInstance): StatisticNode {
  const parsed = parseFormula(FormulaText.parse(definition.base));
  return parsed.ok
    ? { definition, source, reads, formula: parsed.formula, edges: edgesOf(parsed.formula, reads) }
    : { definition, source, reads, formula: parsed, edges: [] };
}

/**
 * The statistics by selector. A later definition of a selector replaces an earlier one, as a pack registered
 * later (homebrew after core) restates a statistic. Iteration follows selector order, so nothing downstream
 * depends on the order the definitions came in.
 */
export function statisticGraph(instances: readonly StatisticInstance[]): ReadonlyMap<Selector, StatisticNode> {
  const latest = new Map(instances.map((instance) => [instance.definition.selector, instance]));
  const selectors = [...latest.keys()].toSorted();
  return new Map(
    selectors.flatMap((selector) => {
      const instance = latest.get(selector);
      return instance === undefined ? [] : [[selector, nodeOf(instance)] as const];
    }),
  );
}

/** The order statistics are first visited in. */
const VisitOrder = z.int().nonnegative().brand<'VisitOrder'>();
type VisitOrder = z.infer<typeof VisitOrder>;

/** Tarjan's bookkeeping per visited statistic. */
interface Visit {
  readonly index: VisitOrder;
  low: VisitOrder;
  onStack: boolean;
}

/**
 * Strongly connected components of the graph in Tarjan's order, which puts every component after the ones it
 * reads: the order to evaluate them in. A component of more than one statistic, or of one that reads itself, is
 * a cycle. Linear in statistics plus references; an edge to a missing statistic is skipped.
 */
export class Components {
  readonly #graph: ReadonlyMap<Selector, StatisticNode>;
  readonly #visits = new Map<Selector, Visit>();
  readonly #stack: Selector[] = [];
  readonly #found: (readonly Selector[])[] = [];

  public constructor(graph: ReadonlyMap<Selector, StatisticNode>) {
    this.#graph = graph;
    for (const selector of graph.keys()) {
      if (!this.#visits.has(selector)) {
        this.#visit(selector);
      }
    }
  }

  /** Each component's statistics in selector order, components in evaluation order. */
  public get inOrder(): readonly (readonly Selector[])[] {
    return this.#found;
  }

  #visit(selector: Selector): Visit {
    const order = VisitOrder.parse(this.#visits.size);
    const visit: Visit = { index: order, low: order, onStack: true };
    this.#visits.set(selector, visit);
    this.#stack.push(selector);
    for (const edge of this.#graph.get(selector)?.edges ?? []) {
      this.#follow(visit, edge.selector);
    }
    if (visit.low === visit.index) {
      this.#close(selector);
    }
    return visit;
  }

  #follow(from: Visit, to: Selector): void {
    if (!this.#graph.has(to)) {
      return;
    }
    const seen = this.#visits.get(to);
    if (seen === undefined) {
      from.low = VisitOrder.parse(Math.min(from.low, this.#visit(to).low));
    } else if (seen.onStack) {
      from.low = VisitOrder.parse(Math.min(from.low, seen.index));
    }
  }

  /** Pops the component rooted at `root`: the statistics above it on the stack, and itself. */
  #close(root: Selector): void {
    const members = this.#stack.splice(this.#stack.lastIndexOf(root));
    for (const member of members) {
      const visit = this.#visits.get(member);
      if (visit !== undefined) {
        visit.onStack = false;
      }
    }
    this.#found.push(members.toSorted());
  }
}
