import { describe, expect, test } from 'bun:test';

import { assert, property, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';
import * as z from 'zod';

import { ContentEntry, REGISTERED_KINDS } from './content-entry';
import type { RegisteredKind } from './content-entry';
import { contentEntryJson, slugText } from './testing';

/** A valid entry of `kind` and a slug to rename it to. */
function renames(kind: RegisteredKind): Arbitrary<readonly [object, string]> {
  return tuple(contentEntryJson(kind), slugText);
}

describe('content entries (properties)', () => {
  test.each([...REGISTERED_KINDS])('valid %s entries parse and encode back unchanged', (kind) => {
    assert(
      property(contentEntryJson(kind), (json) => {
        expect(ContentEntry.safeParse(json).error?.issues).toBeUndefined();
        expect(z.encode(ContentEntry, ContentEntry.parse(json))).toStrictEqual(json);
      }),
    );
  });

  test.each([...REGISTERED_KINDS])("changing a %s entry's slug without its id is always rejected", (kind) => {
    assert(
      property(renames(kind), ([json, slug]) => {
        const original: unknown = Reflect.get(json, 'slug');
        const renamed = { ...json, slug: slug === original ? `${slug}-renamed` : slug };
        expect(ContentEntry.safeParse(renamed).success).toBe(false);
      }),
    );
  });
});
