import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** A count of JSON nesting levels or containers. */
export const JsonSize = z.number().int().positive().brand<'JsonSize'>();
export type JsonSize = z.infer<typeof JsonSize>;

/** How deep and how big a parsed JSON value is allowed to be before a recursive schema walks it. */
export interface JsonBounds {
  /** Deepest nesting of arrays and objects (both count). */
  readonly depth: JsonSize;
  /** Most arrays and objects in the whole value. */
  readonly containers: JsonSize;
}

/** The bound a value breaks first, if any. */
export const JsonBound = { Depth: 'depth', Containers: 'containers' } as const;
export type JsonBound = ValueOf<typeof JsonBound>;

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

/** The arrays and objects directly inside an array or object. */
function innerContainers(value: object): readonly object[] {
  return Object.values(value).filter((child) => isContainer(child));
}

/**
 * Breadth-first, level by level, so deeply nested or very large input is measured without recursion and
 * without walking more than the bounds allow.
 */
export function exceededBound(value: unknown, bounds: JsonBounds): JsonBound | undefined {
  let level: readonly object[] = isContainer(value) ? [value] : [];
  let depth = 0;
  let containers = 0;
  while (level.length > 0) {
    depth += 1;
    containers += level.length;
    if (depth > bounds.depth) {
      return JsonBound.Depth;
    }
    if (containers > bounds.containers) {
      return JsonBound.Containers;
    }
    level = level.flatMap((node) => innerContainers(node));
  }
  return undefined;
}
