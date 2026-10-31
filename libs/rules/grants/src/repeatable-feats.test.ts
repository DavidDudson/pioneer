import { describe, expect, test } from 'bun:test';
import type { Matchers } from 'bun:test';

import { RollOption } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, feat, idOf, inputsOf, picked, picksOf, repeatable, slotOf } from './testing/builders';

/** `expect` on a value as plain data: branded keys and takes compare with plain literals. */
const expectPlain = (actual: unknown): Matchers => expect(actual);

const option = (value: string): object => ({ value, label: value });
const featOption = (slug: string): object => ({ value: idOf(slug), label: slug });
const grantChoice = (flag: string): object => ({ key: 'GrantItem', item: { choice: flag } });

/** Domain Initiate: a domain per take. */
const domainInitiate = repeatable('domain-initiate', [
  {
    key: 'ChoiceSet',
    flag: 'domain',
    prompt: 'Select a domain.',
    rollOption: 'domain-initiate',
    choices: [option('fire'), option('air'), option('earth')],
  },
]);

/** Initiate Warden: a warden spell per take, at most twice. */
const initiateWarden = repeatable(
  'initiate-warden',
  [
    {
      key: 'ChoiceSet',
      flag: 'warden',
      rollOption: 'initiate-warden',
      choices: [option('gale-of-leaves'), option('plant-growth'), option('wild-morph')],
    },
  ],
  2,
);

/** A feat that can be taken once. */
const toughness = feat('toughness', []);

const FEATS = ['domain-initiate', 'initiate-warden', 'toughness'] as const;

/** A class with three feat slots (rules 0, 2 and 4), each granting the feat picked in it. */
const cleric = entry(
  'cleric',
  ['first', 'second', 'third'].flatMap((flag) => [
    { key: 'ChoiceSet', flag, choices: FEATS.map((slug) => featOption(slug)) },
    grantChoice(flag),
  ]),
);
const entries: readonly GrantEntry[] = [cleric, domainInitiate, initiateWarden, toughness];

const FEAT_SLOTS = [slotOf('cleric', 0), slotOf('cleric', 2), slotOf('cleric', 4)] as const;
const FIRST_DOMAIN = slotOf('domain-initiate', 0, FEAT_SLOTS[0]);
const SECOND_DOMAIN = slotOf('domain-initiate', 0, FEAT_SLOTS[1]);

type Pick = readonly [SlotKey, string];

/** The feats the player picked in the class's feat slots, in order. */
function featPicks(...slugs: readonly string[]): Pick[] {
  return slugs.flatMap((slug, index): Pick[] => {
    const slot = FEAT_SLOTS[index];
    return slot === undefined ? [] : [[slot, idOf(slug)]];
  });
}

function resolve(picks: readonly Pick[]): GrantResolution {
  return resolveGrants(inputsOf({ entries, roots: [picked('cleric', 'class')], picks: picksOf(picks) }));
}

const own = (slot: { readonly origin: { readonly entry: string } }): boolean =>
  slot.origin.entry === idOf('domain-initiate');

const takesOf = (result: GrantResolution, slug: string): number[] =>
  result.items.filter((item) => item.entry.id === idOf(slug)).map((item) => item.take);

/** The slots of the feat `slug` still to answer; the class's unfilled feat slot is not one. */
const openOf = (result: GrantResolution, slug: string): GrantResolution['open'] =>
  result.open.filter((slot) => slot.origin.entry === idOf(slug));

describe('a repeatable feat picked in two feat slots', () => {
  test('is on the character once per take', () => {
    const result = resolve(featPicks('domain-initiate', 'domain-initiate'));
    expect(takesOf(result, 'domain-initiate')).toEqual([1, 2]);
    expect(result.duplicates).toEqual([]);
  });

  test('keys each take by the feat slot that picked it', () => {
    expectPlain(FIRST_DOMAIN).toBe(`${idOf('domain-initiate')}:via-${FEAT_SLOTS[0]}:0`);
    expectPlain(SECOND_DOMAIN).toBe(`${idOf('domain-initiate')}:via-${FEAT_SLOTS[1]}:0`);
    const result = resolve(featPicks('domain-initiate', 'domain-initiate'));
    const domains = openOf(result, 'domain-initiate');
    expectPlain(domains.map((slot) => [slot.key, slot.take])).toEqual([
      [FIRST_DOMAIN, 1],
      [SECOND_DOMAIN, 2],
    ]);
  });

  test('picks a domain for each take, and sets a roll option for each', () => {
    const result = resolve([
      ...featPicks('domain-initiate', 'domain-initiate'),
      [FIRST_DOMAIN, 'fire'],
      [SECOND_DOMAIN, 'air'],
    ]);
    expect(openOf(result, 'domain-initiate')).toEqual([]);
    expect(result.errors).toEqual([]);
    const domains = result.answered.filter((slot) => slot.origin.entry === idOf('domain-initiate'));
    expectPlain(domains.map((slot) => [slot.take, slot.pick])).toEqual([
      [1, 'fire'],
      [2, 'air'],
    ]);
    expect(result.rollOptions).toContain(RollOption.parse('domain-initiate:fire'));
    expect(result.rollOptions).toContain(RollOption.parse('domain-initiate:air'));
  });

  test("keeps a take's pick when an earlier feat slot is filled after it", () => {
    const later = resolve([
      [FEAT_SLOTS[1], idOf('domain-initiate')],
      [SECOND_DOMAIN, 'air'],
    ]);
    expectPlain(later.answered.filter(own).map((slot) => [slot.key, slot.take, slot.pick])).toEqual([
      [SECOND_DOMAIN, 1, 'air'],
    ]);
    const both = resolve([...featPicks('domain-initiate', 'domain-initiate'), [SECOND_DOMAIN, 'air']]);
    expectPlain(both.answered.filter(own).map((slot) => [slot.key, slot.take, slot.pick])).toEqual([
      [SECOND_DOMAIN, 2, 'air'],
    ]);
  });

  test('does not offer a later take what an earlier take picked', () => {
    const result = resolve([...featPicks('domain-initiate', 'domain-initiate'), [FIRST_DOMAIN, 'fire']]);
    const second = result.open.find((slot) => slot.key === SECOND_DOMAIN);
    expectPlain(second?.options.map((each) => each.value)).toEqual(['air', 'earth']);
  });

  test('refuses a later take that repeats an earlier pick, and keeps the earlier take', () => {
    const result = resolve([
      ...featPicks('domain-initiate', 'domain-initiate'),
      [FIRST_DOMAIN, 'fire'],
      [SECOND_DOMAIN, 'fire'],
    ]);
    const domains = result.answered.filter((slot) => slot.origin.entry === idOf('domain-initiate'));
    expectPlain(domains.map((slot) => slot.take)).toEqual([1]);
    expectPlain(result.open.map((slot) => slot.key)).toContain(SECOND_DOMAIN);
    expect(result.errors).toHaveLength(1);
  });

  test('stops at maxTakable: a third Initiate Warden is a duplicate', () => {
    const result = resolve(featPicks('initiate-warden', 'initiate-warden', 'initiate-warden'));
    expect(takesOf(result, 'initiate-warden')).toEqual([1, 2]);
    expect(result.duplicates.map((item) => item.entry.id)).toEqual([idOf('initiate-warden')]);
  });

  test('a ranger takes two Initiate Wardens with a spell each', () => {
    const result = resolve([
      ...featPicks('initiate-warden', 'initiate-warden'),
      [slotOf('initiate-warden', 0, FEAT_SLOTS[0]), 'gale-of-leaves'],
      [slotOf('initiate-warden', 0, FEAT_SLOTS[1]), 'wild-morph'],
    ]);
    expect(openOf(result, 'initiate-warden')).toEqual([]);
    expect(result.rollOptions).toContain(RollOption.parse('initiate-warden:gale-of-leaves'));
    expect(result.rollOptions).toContain(RollOption.parse('initiate-warden:wild-morph'));
  });

  test('a feat that can be taken once is a duplicate the second time', () => {
    const result = resolve(featPicks('toughness', 'toughness'));
    expect(takesOf(result, 'toughness')).toEqual([1]);
    expect(result.duplicates).toHaveLength(1);
  });
});
