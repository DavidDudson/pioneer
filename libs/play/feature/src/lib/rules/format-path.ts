import type { FieldIssue } from '@pioneer/shared/kernel';

/** A key that reads unambiguously after a dot; anything else is quoted in brackets. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

function formatSegment(segment: FieldIssue['path'][number], index: number): string {
  if (typeof segment === 'number') {
    return `[${segment}]`;
  }
  if (!IDENTIFIER.test(segment)) {
    return `[${JSON.stringify(segment)}]`;
  }
  return index === 0 ? segment : `.${segment}`;
}

/**
 * A path as it reads in JSON tooling: `[0].or[1].not`, with awkward keys quoted (`["a.b"]`, `[""]`).
 * Empty for the whole value.
 */
export function formatPath(path: FieldIssue['path']): string {
  return path.map((segment, index) => formatSegment(segment, index)).join('');
}
