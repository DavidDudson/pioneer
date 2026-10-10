import type { Logger } from 'drizzle-orm/logger';
import * as z from 'zod';

/** Plan node types that mean "no index served this". */
const FORBIDDEN_NODES = new Set(['Seq Scan', 'Sort']);

interface PlanNode {
  readonly 'Node Type': string;
  readonly 'Relation Name'?: string | undefined;
  readonly Plans?: readonly PlanNode[] | undefined;
}

const PlanNodeSchema: z.ZodType<PlanNode> = z.lazy(() =>
  z.object({
    'Node Type': z.string(),
    'Relation Name': z.string().optional(),
    Plans: z.array(PlanNodeSchema).optional(),
  }),
);
const PlanEntrySchema = z.object({ Plan: PlanNodeSchema });
const PlanRowsSchema = z.array(z.object({ 'QUERY PLAN': z.array(PlanEntrySchema) }));

interface RecordedQuery {
  readonly query: string;
  readonly params: readonly unknown[];
}

/** A Drizzle logger that remembers every statement, for `assertIndexedPlans`. */
export class QueryRecorder implements Logger {
  readonly #queries: RecordedQuery[] = [];

  public logQuery(query: string, params: unknown[]): void {
    this.#queries.push({ query, params });
  }

  public get queries(): readonly RecordedQuery[] {
    return this.#queries;
  }
}

function forbiddenNodes(node: PlanNode): readonly string[] {
  const own = FORBIDDEN_NODES.has(node['Node Type']) ? [`${node['Node Type']} on ${node['Relation Name'] ?? '?'}`] : [];
  return [...own, ...(node.Plans ?? []).flatMap((child) => forbiddenNodes(child))];
}

/**
 * EXPLAIN every recorded SELECT/UPDATE/DELETE with sequential scans and
 * explicit sorts disabled. Postgres only falls back to them when no index can
 * serve the query, so any `Seq Scan` or `Sort` left in the plan is a missing
 * index. Returns one message per offending query (empty = all indexed).
 */
const PLANNABLE = /^\s*(?:select|update|delete)\b/iu;

async function explain(client: Bun.SQL, { query, params }: RecordedQuery): Promise<string | undefined> {
  const plan = await client.begin(async (tx): Promise<PlanNode | undefined> => {
    await tx.unsafe('set local enable_seqscan = off');
    await tx.unsafe('set local enable_sort = off');
    const rows = PlanRowsSchema.parse(await tx.unsafe(`explain (format json) ${query}`, [...params]));
    return rows[0]?.['QUERY PLAN'][0]?.Plan;
  });
  const nodes = plan === undefined ? ['no plan'] : forbiddenNodes(plan);
  return nodes.length === 0 ? undefined : `${nodes.join(', ')}: ${query}`;
}

export async function unindexedQueries(
  db: { readonly $client: Bun.SQL },
  recorder: QueryRecorder,
): Promise<readonly string[]> {
  const planned = recorder.queries.filter(({ query }) => PLANNABLE.test(query));
  const problems = await Promise.all(planned.map(async (recorded) => explain(db.$client, recorded)));
  return problems.filter((problem) => problem !== undefined);
}
