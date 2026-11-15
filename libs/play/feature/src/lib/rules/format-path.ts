import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** A key that reads unambiguously after a dot; anything else is quoted in brackets. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

function formatSegment(segment: FieldIssue['path'][number], index: number): string {
  const name = z.string().safeParse(segment);

  if (!name.success) {
    return `[${segment}]`;
  }

  if (!IDENTIFIER.test(name.data)) {
    return `[${JSON.stringify(name.data)}]`;
  }

  return index === 0 ? name.data : `.${name.data}`;
}

/**
 * A path as it reads in JSON tooling: `[0].or[1].not`, with awkward keys quoted (`["a.b"]`, `[""]`).
 * Empty for the whole value.
 */
export function formatPath(path: FieldIssue['path']): string {
  return path.map((segment, index) => formatSegment(segment, index)).join('');
}
