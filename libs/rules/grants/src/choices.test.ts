import { describe, expect, test } from 'bun:test';

import { PredicateFacts, SummaryKind } from '@pioneer/rules/predicate';
import { ContentText, OriginHop, RollOption } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { GrantEntry, GrantRoot } from './grant-entry';
import { GrantsMessage } from './messages';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, grantOf, idOf, lookupOf, picked, picksOf, slotOf } from './testing/builders';

/** The player's picks, and the roll options that hold. */
interface Situation {
  readonly picks?: readonly (readonly [SlotKey, string])[];
  readonly options?: readonly string[];
}

function resolve(
  entries: readonly GrantEntry[],
  roots: readonly GrantRoot[],
  { picks = [], options = [] }: Situation = {},
): GrantResolution {
  const facts = new PredicateFacts(options.map((option) => RollOption.parse(option)));
  return resolveGrants({ roots, lookup: lookupOf(entries), facts, picks: picksOf(picks) });
}

const chosen = (slot: string): OriginHop => OriginHop.parse({ kind: 'choice', slot });
const granted = (by: string, rule: number): OriginHop => OriginHop.parse({ kind: 'grant', by: idOf(by), rule });
const names = (items: readonly { readonly entry: GrantEntry }[]): string[] => items.map((item) => item.entry.name);

const option = (slug: string, more: object = {}): object => ({ value: idOf(slug), label: slug, ...more });
const grantChoice = (flag: string): object => ({ key: 'GrantItem', item: { choice: flag } });

/** A rogue picks a racket at rule 0, granted at rule 1; each racket grants a feature. */
const rogueContent = [
  entry('rogue', [
    { key: 'ChoiceSet', flag: 'racket', prompt: 'Rogue racket', choices: [option('thief'), option('ruffian')] },
    grantChoice('racket'),
  ]),
  entry('thief', [grantOf('thief-feature')]),
  entry('thief-feature'),
  entry('ruffian'),
];

const RACKET = slotOf('rogue', 0);

describe('resolveGrants choices', () => {
  test('reports an unanswered ChoiceSet as an open slot, and holds back its grant', () => {
    const result = resolve(rogueContent, [picked('rogue', 'class')]);
    expect(names(result.items)).toEqual(['rogue']);
    expect(result.errors).toEqual([]);
    expect(result.answered).toEqual([]);
    expect(result.open).toHaveLength(1);
    const [slot] = result.open;
    expect(slot?.key).toBe(RACKET);
    expect(String(slot?.flag)).toBe('racket');
    expect(slot?.prompt).toBe(ContentText.parse('Rogue racket'));
    expect(slot?.origin.hops).toEqual([chosen('class')]);
    expect(slot?.origin.entry).toBe(idOf('rogue'));
    expect(slot?.options.map((offered) => offered.value)).toEqual([idOf('thief'), idOf('ruffian')]);
  });

  test('grants the picked entry behind a choice hop, then a grant hop', () => {
    const result = resolve(rogueContent, [picked('rogue', 'class')], { picks: [[RACKET, idOf('thief')]] });
    expect(names(result.items)).toEqual(['rogue', 'thief', 'thief-feature']);
    expect(result.open).toEqual([]);
    expect(result.answered.map((slot) => slot.pick)).toEqual([idOf('thief')]);
    expect(result.items[1]?.origin.hops).toEqual([chosen('class'), chosen(RACKET), granted('rogue', 1)]);
    expect(result.items[2]?.origin.hops).toEqual([
      chosen('class'),
      chosen(RACKET),
      granted('rogue', 1),
      granted('thief', 0),
    ]);
  });

  test('keys a slot by its entry and rule, however the entry got there', () => {
    const content = [...rogueContent, entry('dedication', [grantOf('rogue')])];
    const direct = resolve(content, [picked('rogue', 'class')]);
    const granting = resolve(content, [picked('dedication', 'archetype')]);
    expect(granting.open.map((slot) => slot.key)).toEqual(direct.open.map((slot) => slot.key));
  });

  test('removing a pick drops everything granted through it, and reopens the slot', () => {
    const answered = resolve(rogueContent, [picked('rogue')], { picks: [[RACKET, idOf('thief')]] });
    const removed = resolve(rogueContent, [picked('rogue')]);
    expect(names(answered.items)).toEqual(['rogue', 'thief', 'thief-feature']);
    expect(names(removed.items)).toEqual(['rogue']);
    expect(removed.open.map((slot) => slot.key)).toEqual([RACKET]);
  });

  test('ignores a pick for a slot that is not on the character', () => {
    const result = resolve(rogueContent, [picked('rogue')], { picks: [[slotOf('wizard', 0), idOf('thief')]] });
    expect(names(result.items)).toEqual(['rogue']);
    expect(result.errors).toEqual([]);
  });

  test('leaves out options whose predicate fails, and offers unknown ones with when they hold', () => {
    const content = [
      entry('ranger', [
        {
          key: 'ChoiceSet',
          flag: 'edge',
          choices: [
            option('flurry'),
            option('outwit', { predicate: [{ gte: ['self:level', 5] }] }),
            option('precision', { predicate: ['terrain:forest'] }),
          ],
        },
      ]),
    ];
    const result = resolve(content, [picked('ranger')], { options: ['self:level:1'] });
    const offered = result.open.flatMap((slot) => slot.options);
    expect(offered.map((shown) => shown.value)).toEqual([idOf('flurry'), idOf('precision')]);
    expect(offered.map((shown) => shown.summary?.kind)).toEqual([undefined, SummaryKind.Phrase]);
  });

  test('accepts a pick of an option that is offered conditionally', () => {
    const content = [
      entry('ranger', [
        { key: 'ChoiceSet', flag: 'edge', choices: [option('precision', { predicate: ['terrain:forest'] })] },
        grantChoice('edge'),
      ]),
      entry('precision'),
    ];
    const result = resolve(content, [picked('ranger')], { picks: [[slotOf('ranger', 0), idOf('precision')]] });
    expect(names(result.items)).toEqual(['ranger', 'precision']);
  });

  test('reports a pick that is not on offer, naming the slot and value, and reopens the slot', () => {
    const result = resolve(rogueContent, [picked('rogue', 'class')], { picks: [[RACKET, idOf('scoundrel')]] });
    expect(names(result.items)).toEqual(['rogue']);
    expect(result.open.map((slot) => slot.key)).toEqual([RACKET]);
    expect(result.errors).toEqual([
      {
        error: message(GrantsMessage.PickNotOffered, { entry: 'rogue', value: idOf('scoundrel') }),
        hops: [chosen('class'), chosen(RACKET)],
      },
    ]);
  });

  test('reports a pick of a plain option that a GrantItem refers to', () => {
    const content = [
      entry('ranger', [
        { key: 'ChoiceSet', flag: 'terrain', choices: [{ value: 'forest', label: 'Forest' }] },
        grantChoice('terrain'),
      ]),
    ];
    const result = resolve(content, [picked('ranger')], { picks: [[slotOf('ranger', 0), 'forest']] });
    expect(names(result.items)).toEqual(['ranger']);
    expect(result.errors.map((failure) => failure.error)).toEqual([
      message(GrantsMessage.PickNotEntry, { flag: 'terrain', value: 'forest' }),
    ]);
    expect(result.errors[0]?.hops.at(-1)).toEqual(chosen(slotOf('ranger', 0)));
  });

  test('reports a GrantItem whose choice no ChoiceSet on the entry names', () => {
    const result = resolve([entry('rogue', [grantChoice('racket')])], [picked('rogue', 'class')]);
    expect(result.errors).toEqual([
      { error: message(GrantsMessage.UnknownChoice, { entry: 'rogue', flag: 'racket' }), hops: [chosen('class')] },
    ]);
  });

  test('turns a pick into a roll option under its rollOption', () => {
    const content = [
      entry('ranger', [
        {
          key: 'ChoiceSet',
          flag: 'terrain',
          rollOption: 'favored-terrain',
          choices: [
            { value: 'forest', label: 'Forest' },
            { value: 'swamp', label: 'Swamp' },
          ],
        },
      ]),
    ];
    const result = resolve(content, [picked('ranger')], { picks: [[slotOf('ranger', 0), 'forest']] });
    expect(result.rollOptions).toEqual([RollOption.parse('favored-terrain:forest')]);
    expect(result.errors).toEqual([]);
  });

  test('opens no slot for a ChoiceSet whose predicate is not true, and its grant waits quietly', () => {
    const content = [
      entry('fighter', [
        { key: 'ChoiceSet', flag: 'style', predicate: [{ gte: ['self:level', 2] }], choices: [option('dual')] },
        grantChoice('style'),
      ]),
    ];
    const result = resolve(content, [picked('fighter')], { options: ['self:level:1'] });
    expect(result.open).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('leaves a ChoiceSet over a content query for query resolution', () => {
    const content = [
      entry('fighter', [{ key: 'ChoiceSet', flag: 'ancestry', choices: { kind: 'ancestry', filter: ['trait:elf'] } }]),
    ];
    const result = resolve(content, [picked('fighter')]);
    expect(result.open).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
