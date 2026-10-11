import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentText, OriginHop, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { GrantEntry } from './grant-entry';
import { GrantsMessage } from './messages';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import type { RootSlotDefinition } from './root-slots';
import { entry, grantOf, idOf, inputsOf, picksOf } from './testing/builders';

const ANCESTRY = SlotKey.parse('ancestry');
const ROOT_SLOTS: readonly RootSlotDefinition[] = [{ key: ANCESTRY, kind: ContentKind.Ancestry }];

/** An ancestry of the test pack named `name`, with `rules` as JSON. */
function ancestry(slug: string, name: string, rules: readonly object[] = []): GrantEntry {
  return { ...entry(slug, rules), kind: ContentKind.Ancestry, name: ContentText.parse(name) };
}

const CONTENT = [
  ancestry('human', 'Human'),
  ancestry('elf', 'Elf', [grantOf('low-light-vision')]),
  entry('low-light-vision'),
  entry('fighter'),
];

function resolve(picks: readonly (readonly [SlotKey, string])[] = []): GrantResolution {
  return resolveGrants(inputsOf({ entries: CONTENT, roots: [], picks: picksOf(picks), rootSlots: ROOT_SLOTS }));
}

describe('root slots', () => {
  test('an unpicked root slot is open and offers every entry of its kind, by name', () => {
    const [slot] = resolve().rootSlots;
    expect(slot?.key).toBe(ANCESTRY);
    expect(slot?.pick).toBeUndefined();
    expect(slot?.options.map((option) => String(option.label))).toEqual(['Elf', 'Human']);
  });

  test('a pick of its kind answers the slot and is a root behind a choice hop', () => {
    const result = resolve([[ANCESTRY, idOf('elf')]]);
    expect(result.rootSlots[0]?.pick).toBe(idOf('elf'));
    expect(result.items.map((item) => String(item.entry.name))).toEqual(['Elf', 'low-light-vision']);
    expect(result.items[0]?.origin.hops).toEqual([OriginHop.parse({ kind: 'choice', slot: ANCESTRY })]);
    expect(result.errors).toEqual([]);
  });

  test('a pick of another kind is an error, and the slot is open again', () => {
    const result = resolve([[ANCESTRY, idOf('fighter')]]);
    expect(result.rootSlots[0]?.pick).toBeUndefined();
    expect(result.items).toEqual([]);
    expect(result.errors).toEqual([
      {
        error: message(GrantsMessage.RootPickNotOffered, { value: idOf('fighter'), kind: ContentKind.Ancestry }),
        hops: [OriginHop.parse({ kind: 'choice', slot: ANCESTRY })],
      },
    ]);
  });

  test('without root slots, a pick under a root key grants nothing', () => {
    const picks = picksOf([[ANCESTRY, idOf('elf')]]);
    const result = resolveGrants(inputsOf({ entries: CONTENT, roots: [], picks }));
    expect(result.rootSlots).toEqual([]);
    expect(result.items).toEqual([]);
  });
});
