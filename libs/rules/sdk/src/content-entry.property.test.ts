import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import { assert, property, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';
import * as z from 'zod';

import { contentId, EntrySlug, PackId } from './content-id';
import { ContentKind } from './content-kind';
import { REGISTERED_KINDS } from './kind-data';
import type { RegisteredKind } from './kind-data';
import { RulesMessage } from './messages';
import { contentEntryJson, EntryIdentityJson, slugText } from './testing';
import { ContentEntry } from './typed-content-entry';

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
        const original = EntryIdentityJson.parse(json).slug;
        const candidate = `${kind}:${slug}`;
        const renamed = { ...json, slug: candidate === original ? `${candidate}-renamed` : candidate };
        const rejected = fieldIssues(ContentEntry.safeParse(renamed).error?.issues ?? []);
        expect(rejected.map((issue) => [issue.path, issue.message.key])).toStrictEqual([
          [['id'], RulesMessage.EntryIdMismatch],
        ]);
      }),
    );
  });
});

describe('content entry slugs (properties)', () => {
  test.each([...REGISTERED_KINDS])('a %s entry whose slug names another kind is rejected', (kind) => {
    const other = kind === ContentKind.Trait ? ContentKind.Language : ContentKind.Trait;
    assert(
      property(contentEntryJson(kind), (json) => {
        const identity = EntryIdentityJson.parse(json);
        const name = identity.slug.split(':')[1] ?? '';
        const slug = EntrySlug.parse(`${other}:${name}`);
        const id = contentId(PackId.parse(identity.pack), slug);
        const rejected = fieldIssues(ContentEntry.safeParse({ ...json, slug, id }).error?.issues ?? []);
        expect(rejected.map((issue) => [issue.path, issue.message.key])).toStrictEqual([
          [['slug'], RulesMessage.EntrySlugKindMismatch],
        ]);
      }),
    );
  });
});
