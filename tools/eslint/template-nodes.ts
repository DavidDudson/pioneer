/**
 * What a template rule reads from the nodes of Angular's template parser. ESLint types every listener's node as an
 * ESTree node, which a template node is not, and the parser's own node types are not exported. So a visitor takes
 * ESLint's `Rule.Node` and decodes the fields it reads with a schema, leaving a node of another shape unvisited.
 */
import type { Rule } from 'eslint';
import * as z from 'zod';

/** The node ESLint hands a listener; its template shape is decoded by the visitor. */
export type VisitedNode = Rule.Node;

/** Where a node starts in the template source. */
export const Start = z.looseObject({ start: z.looseObject({ offset: z.number() }) });

export type Start = z.infer<typeof Start>;

/** Where a node starts and ends in the template source. */
export const Span = z.looseObject({
  start: z.looseObject({ offset: z.number() }),
  end: z.looseObject({ offset: z.number() }),
});

export type Span = z.infer<typeof Span>;
