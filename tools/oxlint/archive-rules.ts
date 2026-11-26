/**
 * Archive, never delete (ADR-0062): a table that holds user content is archived, not deleted from. The database
 * refuses the delete too (`archive.protect`); this reports it before it runs. Registered by pioneer-plugin.ts.
 */
import type { Rule } from 'eslint';

/**
 * Drizzle table names (the exported const) whose rows are archived. A table joins this list in the same change that
 * adds its `archived_at` column and `archive.protect` trigger.
 */
export const ARCHIVABLE_TABLES: ReadonlySet<string> = new Set([
  'characters',
  'campaigns',
  'contentPacks',
  'campaignItemApprovals',
  'campaignKeyItems',
  'characterItemAcknowledgements',
  'characterCompanions',
]);

/** The syntax node of a call, as far as the rule reads it. */
export interface DeleteCallNode {
  readonly callee?: { readonly type?: string; readonly property?: { readonly type?: string; readonly name?: string } };
  readonly arguments?: ReadonlyArray<{ readonly type?: string; readonly name?: string }>;
}

/** The archivable table `db.delete(table)` names, or `undefined` for any other call. */
export function archivableDeleteTarget(
  node: DeleteCallNode,
  tables: ReadonlySet<string> = ARCHIVABLE_TABLES,
): string | undefined {
  const { callee, arguments: args } = node;

  if (callee?.type !== 'MemberExpression' || callee.property?.name !== 'delete') {
    return undefined;
  }

  const [table] = args ?? [];

  if (table?.type !== 'Identifier' || table.name === undefined) {
    return undefined;
  }

  return tables.has(table.name) ? table.name : undefined;
}

export const noArchivableDelete: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow deleting rows from tables whose content is archived, never deleted' },
    messages: { delete: '{{table}} rows are archived, never deleted. Set archived_at instead (ADR-0062).' },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node): void {
        const table = archivableDeleteTarget(node);

        if (table !== undefined) {
          context.report({ node, messageId: 'delete', data: { table } });
        }
      },
    };
  },
};
