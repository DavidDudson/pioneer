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

const HERITAGE = SlotKey.parse('heritage');
const NESTED: readonly RootSlotDefinition[] = [
  ...ROOT_SLOTS,
  { key: HERITAGE, kind: ContentKind.Heritage, within: ANCESTRY },
];

/** A heritage of the test pack, of the ancestry `ancestrySlug`, or versatile without one. */
function heritage(slug: string, ancestrySlug?: string): GrantEntry {
  const base = { ...entry(slug), kind: ContentKind.Heritage, name: ContentText.parse(slug) };
  return ancestrySlug === undefined ? base : { ...base, belongsTo: idOf(ancestrySlug) };
}

const HERITAGES = [heritage('whisper-elf', 'elf'), heritage('skilled-human', 'human'), heritage('changeling')];

function nested(picks: readonly (readonly [SlotKey, string])[]): GrantResolution {
  const entries = [...CONTENT, ...HERITAGES];
  return resolveGrants(inputsOf({ entries, roots: [], picks: picksOf(picks), rootSlots: NESTED }));
}

function heritagesOffered(result: GrantResolution): string[] {
  const options = result.rootSlots[1]?.options ?? [];
  return options.map((option) => String(option.label));
}

describe('a root slot within another', () => {
  test('offers the heritages of the picked ancestry and the versatile ones', () => {
    const asElf = nested([[ANCESTRY, idOf('elf')]]);
    expect(heritagesOffered(asElf)).toEqual(['changeling', 'whisper-elf']);
  });

  test('offers only the versatile ones while the ancestry is open', () => {
    expect(heritagesOffered(nested([]))).toEqual(['changeling']);
  });

  test('a heritage of another ancestry is an error, and the slot is open', () => {
    const result = nested([
      [ANCESTRY, idOf('human')],
      [HERITAGE, idOf('whisper-elf')],
    ]);
    expect(result.rootSlots[1]?.pick).toBeUndefined();
    expect(result.items.map((item) => String(item.entry.name))).toEqual(['Human']);
    expect(result.errors.map((error) => error.hops)).toEqual([[OriginHop.parse({ kind: 'choice', slot: HERITAGE })]]);
  });

  test.each(['whisper-elf', 'changeling'])(
    'a heritage of the ancestry, or a versatile one (%s), answers it',
    (pick) => {
      const result = nested([
        [ANCESTRY, idOf('elf')],
        [HERITAGE, idOf(pick)],
      ]);
      expect(result.rootSlots[1]?.pick).toBe(idOf(pick));
      expect(result.errors).toEqual([]);
    },
  );
});
