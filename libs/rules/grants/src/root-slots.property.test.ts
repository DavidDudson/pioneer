import { describe, expect, test } from 'bun:test';

import { ContentKind, SlotKey } from '@pioneer/rules/sdk';
import { assert, boolean, constantFrom, property, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import type { RootSlotDefinition } from './root-slots';
import { entry, grantOf, idOf, inputsOf, picksOf } from './testing/builders';

const ANCESTRY = SlotKey.parse('ancestry');
const ROOT_SLOTS: readonly RootSlotDefinition[] = [{ key: ANCESTRY, kind: ContentKind.Ancestry }];
const SLUGS = ['dwarf', 'elf', 'goblin', 'human', 'orc'] as const;

/** Each slug as an ancestry that grants its own feature, or as a class feature. */
function contentOf(isAncestry: readonly boolean[]): GrantEntry[] {
  return SLUGS.flatMap((slug, index) => {
    const kind = isAncestry[index] === true ? ContentKind.Ancestry : ContentKind.ClassFeature;
    return [{ ...entry(slug, [grantOf(`${slug}-feature`)]), kind }, entry(`${slug}-feature`)];
  });
}

const kinds: Arbitrary<boolean[]> = tuple(boolean(), boolean(), boolean(), boolean(), boolean());

function resolve(content: readonly GrantEntry[], pick: string | undefined): GrantResolution {
  const picks = picksOf(pick === undefined ? [] : [[ANCESTRY, idOf(pick)]]);
  return resolveGrants(inputsOf({ entries: content, roots: [], picks, rootSlots: ROOT_SLOTS }));
}

describe('root slots (properties)', () => {
  test('a pick answers the slot exactly when it is an entry of the slot’s kind', () => {
    assert(
      property(kinds, constantFrom(...SLUGS), (isAncestry, slug) => {
        const content = contentOf(isAncestry);
        const result = resolve(content, slug);
        const ofKind = content.find((each) => each.id === idOf(slug))?.kind === ContentKind.Ancestry;
        expect(result.rootSlots[0]?.pick).toBe(ofKind ? idOf(slug) : undefined);
        expect(result.errors).toHaveLength(ofKind ? 0 : 1);
      }),
    );
  });

  test('removing the pick drops everything granted through it and leaves the offer as it was', () => {
    assert(
      property(kinds, constantFrom(...SLUGS), (isAncestry, slug) => {
        const content = contentOf(isAncestry);
        const picked = resolve(content, slug);
        const unpicked = resolve(content, undefined);
        expect(unpicked.items).toEqual([]);
        expect(unpicked.rootSlots[0]?.pick).toBeUndefined();
        expect(unpicked.rootSlots[0]?.options).toEqual(picked.rootSlots[0]?.options ?? []);
      }),
    );
  });
});
