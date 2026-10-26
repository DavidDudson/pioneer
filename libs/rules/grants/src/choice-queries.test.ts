import { describe, expect, test } from 'bun:test';

import { SummaryKind } from '@pioneer/rules/predicate';
import { ContentKind, ContentLevel, ContentText, OriginHop, RollOption } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { GrantEntry } from './grant-entry';
import { GrantsMessage } from './messages';
import type { OfferedOption } from './offers';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, feat, idOf, inputsOf, picked, picksOf, slotOf } from './testing/builders';

interface Situation {
  readonly picks?: readonly (readonly [SlotKey, string])[];
  readonly level?: number;
  readonly situation?: readonly string[];
}

function resolve(entries: readonly GrantEntry[], { picks = [], level, situation }: Situation = {}): GrantResolution {
  return resolveGrants(inputsOf({ entries, roots: [picked('fighter')], level, situation, picks: picksOf(picks) }));
}

/** What the first open slot offers. */
const optionsOf = (result: GrantResolution): readonly OfferedOption[] => result.open[0]?.options ?? [];

const offered = (result: GrantResolution): string[] =>
  result.open.flatMap((slot) => slot.options.map((option) => option.label));

/** A fighter whose rule 0 asks for a feat matching `filter`, granted by rule 1 and recorded as `class-feat:<pick>`. */
function fighter(filter: readonly unknown[]): GrantEntry {
  return entry('fighter', [
    { key: 'ChoiceSet', flag: 'class-feat', rollOption: 'class-feat', choices: { kind: 'feat', filter } },
    { key: 'GrantItem', item: { choice: 'class-feat' } },
  ]);
}

/** A 1st-level fighter feat, of a level no higher than the character's. */
const CLASS_FEAT = ['item:trait:fighter', { lte: ['item:level', 'self:level'] }];
const CLASS_FEAT_SLOT = slotOf('fighter', 0);

const SUDDEN_CHARGE = feat('sudden-charge', ['trait:fighter', 'level:1'], 'Sudden Charge');

const feats = [
  SUDDEN_CHARGE,
  feat('double-slice', ['trait:fighter', 'level:1'], 'Double Slice'),
  feat('aggressive-block', ['trait:fighter', 'level:2'], 'Aggressive Block'),
  feat('trick-attack', ['trait:rogue', 'level:1'], 'Trick Attack'),
];

describe('resolveGrants choice queries', () => {
  test('offers each entry of the kind whose own options and the character facts satisfy the filter', () => {
    const result = resolve([fighter(CLASS_FEAT), ...feats], { level: 1 });
    expect(result.errors).toEqual([]);
    expect(result.open.map((slot) => slot.key)).toEqual([CLASS_FEAT_SLOT]);
    expect(offered(result)).toEqual(['Double Slice', 'Sudden Charge']);
    expect(optionsOf(result).map((option) => option.value)).toEqual([idOf('double-slice'), idOf('sudden-charge')]);
  });

  test('reads the character facts, so a higher level offers more', () => {
    const result = resolve([fighter(CLASS_FEAT), ...feats], { level: 2 });
    expect(offered(result)).toEqual(['Aggressive Block', 'Double Slice', 'Sudden Charge']);
  });

  test('offers only entries of the query kind, even one whose options match', () => {
    const feature = { ...feat('bravery', ['trait:fighter'], 'Bravery'), kind: ContentKind.ClassFeature };
    const offeredNames = offered(resolve([fighter(['item:trait:fighter']), ...feats, feature]));
    expect(offeredNames).not.toContain('Bravery');
    expect(offeredNames).toContain('Sudden Charge');
  });

  test('a general feat query also offers skill feats, which are general feats', () => {
    const query = entry('fighter', [
      {
        key: 'ChoiceSet',
        flag: 'general-feat',
        choices: { kind: 'feat', filter: ['item:trait:general'] },
      },
    ]);
    const content = [
      query,
      feat('toughness', ['trait:general'], 'Toughness'),
      feat('break-curse', ['trait:skill'], 'Break Curse'),
      feat('double-slice', ['trait:fighter'], 'Double Slice'),
    ];
    expect(offered(resolve(content))).toEqual(['Break Curse', 'Toughness']);
  });

  test('an ancestry feat query offers a Universal Ancestry feat as the trait of the ancestry', () => {
    const query = entry('fighter', [
      { key: 'ChoiceSet', flag: 'ancestry-feat', choices: { kind: 'feat', filter: ['item:trait:human'] } },
    ]);
    const content = [
      query,
      feat('fey-influence', ['trait:universal-ancestry'], 'Fey Influence'),
      feat('adapted-cantrip', ['trait:human'], 'Adapted Cantrip'),
      feat('burrow', ['trait:gnome'], 'Burrow'),
    ];
    expect(offered(resolve(content, { situation: ['ancestry:human'] }))).toEqual(['Adapted Cantrip', 'Fey Influence']);
    expect(offered(resolve(content, { situation: ['ancestry:gnome'] }))).toEqual(['Adapted Cantrip']);
  });

  test('an archetype feat query offers an additional feat of an archetype whose dedication the character holds, at its level', () => {
    const query = entry('fighter', [
      {
        key: 'ChoiceSet',
        flag: 'archetype-feat',
        choices: { kind: 'feat', filter: ['item:trait:archetype', { lte: ['item:level', 'self:level'] }] },
      },
    ]);
    const archetype: GrantEntry = {
      ...entry('knight-vigilant'),
      kind: ContentKind.Archetype,
      archetype: {
        dedication: idOf('knight-vigilant-dedication'),
        additionalFeats: [{ feat: idOf('shield-warden'), level: ContentLevel.parse(8) }],
      },
    };
    const content = [
      query,
      archetype,
      { ...feat('knight-vigilant-dedication', ['trait:archetype', 'level:6']) },
      feat('shield-warden', ['trait:champion', 'level:6'], 'Shield Warden'),
    ];
    const held = ['feat:knight-vigilant-dedication'];
    expect(offered(resolve(content, { level: 8, situation: held }))).toEqual([
      'Shield Warden',
      'knight-vigilant-dedication',
    ]);
    expect(offered(resolve(content, { level: 7, situation: held }))).toEqual(['knight-vigilant-dedication']);
    expect(offered(resolve(content, { level: 8 }))).toEqual(['knight-vigilant-dedication']);
  });

  test('a class feat query also offers archetype feats, which count as the character class feats', () => {
    const query = entry('fighter', [
      { key: 'ChoiceSet', flag: 'class-feat', choices: { kind: 'feat', filter: ['item:trait:fighter'] } },
    ]);
    const content = [
      query,
      feat('double-slice', ['trait:fighter'], 'Double Slice'),
      feat('rogue-dedication', ['trait:archetype'], 'Rogue Dedication'),
      feat('trick-attack', ['trait:rogue'], 'Trick Attack'),
    ];
    expect(offered(resolve(content, { situation: ['class:fighter'] }))).toEqual(['Double Slice', 'Rogue Dedication']);
  });

  test('ownTrait offers only entries with a trait named like the character class', () => {
    const query = entry('fighter', [
      { key: 'ChoiceSet', flag: 'class-feat', choices: { kind: 'feat', filter: ['item:level:1'], ownTrait: 'class' } },
    ]);
    const content = [query, ...feats.filter((each) => each.rollOptions.includes(RollOption.parse('level:1')))];
    expect(offered(resolve(content, { situation: ['class:fighter'] }))).toEqual(['Double Slice', 'Sudden Charge']);
    expect(offered(resolve(content, { situation: ['class:rogue'] }))).toEqual(['Trick Attack']);
  });

  test('ownTrait offers the feats of either class of a dual-class character, and none before a class is picked', () => {
    const query = entry('fighter', [
      { key: 'ChoiceSet', flag: 'class-feat', choices: { kind: 'feat', filter: ['item:level:1'], ownTrait: 'class' } },
    ]);
    const content = [query, ...feats];
    expect(offered(resolve(content, { situation: ['class:fighter', 'class:rogue'] }))).toEqual([
      'Double Slice',
      'Sudden Charge',
      'Trick Attack',
    ]);
    expect(offered(resolve(content))).toEqual([]);
  });

  test('ownTrait reads the ancestry the same way', () => {
    const query = entry('fighter', [
      {
        key: 'ChoiceSet',
        flag: 'ancestry-feat',
        choices: { kind: 'feat', filter: ['item:level:1'], ownTrait: 'ancestry' },
      },
    ]);
    const content = [
      query,
      feat('adapted-cantrip', ['trait:human', 'level:1'], 'Adapted Cantrip'),
      feat('burrow', ['trait:gnome', 'level:1'], 'Burrow'),
    ];
    expect(offered(resolve(content, { situation: ['ancestry:human'] }))).toEqual(['Adapted Cantrip']);
  });

  test('keeps an entry option apart from the character fact of the same name', () => {
    const content = [fighter(['feat:sudden-charge']), feat('sudden-charge', ['feat:sudden-charge'], 'Sudden Charge')];
    expect(offered(resolve(content))).toEqual([]);
    expect(offered(resolve(content, { situation: ['feat:sudden-charge'] }))).toEqual(['Sudden Charge']);
    const asksItem = [fighter(['item:feat:sudden-charge']), ...content.slice(1)];
    expect(offered(resolve(asksItem))).toEqual(['Sudden Charge']);
  });

  test('ignores item: facts the character has, reading only the candidate options', () => {
    const content = [fighter(['item:trait:fighter']), ...feats];
    const result = resolve(content, { situation: ['item:trait:fighter'] });
    expect(offered(result)).not.toContain('Trick Attack');
    expect(offered(result)).toContain('Sudden Charge');
  });

  test('offers an entry whose filter is unknown with when it would hold, and one that holds without', () => {
    const result = resolve([fighter(['item:trait:fighter', 'terrain:forest']), SUDDEN_CHARGE]);
    const [option] = optionsOf(result);
    expect(option?.label).toBe(ContentText.parse('Sudden Charge'));
    expect(option?.summary?.kind).toBe(SummaryKind.Phrase);
    const holding = resolve([fighter(['item:trait:fighter']), ...feats]);
    expect(optionsOf(holding).every((each) => each.summary === undefined)).toBe(true);
  });

  test('sorts by name, then id, whatever order the content lists them in', () => {
    const twins = [feat('b-twin', ['trait:fighter'], 'Twin'), feat('a-twin', ['trait:fighter'], 'Twin')];
    const content = [fighter(['item:trait:fighter']), ...twins, ...feats];
    const forward = optionsOf(resolve(content));
    const backward = optionsOf(resolve(content.toReversed()));
    expect(forward).toEqual(backward);
    const twinIds: readonly string[] = [idOf('a-twin'), idOf('b-twin')].toSorted();
    const values = forward.map((option) => String(option.value));
    expect(values.filter((value) => twinIds.includes(value))).toEqual([...twinIds]);
  });

  test('a query matching nothing is an open slot with an empty offer, not an error', () => {
    const result = resolve([fighter(['item:trait:wizard']), ...feats]);
    expect(result.errors).toEqual([]);
    expect(result.open).toHaveLength(1);
    expect(optionsOf(result)).toEqual([]);
  });

  test('a pick among the matches answers the slot, grants the entry and sets its roll option', () => {
    const picks = [[CLASS_FEAT_SLOT, idOf('sudden-charge')]] as const;
    const result = resolve([fighter(CLASS_FEAT), ...feats], { picks, level: 1 });
    expect(result.errors).toEqual([]);
    expect(result.open).toEqual([]);
    expect(result.answered.map((slot) => slot.pick)).toEqual([idOf('sudden-charge')]);
    const granted = result.items.find((item) => item.entry.id === idOf('sudden-charge'));
    expect(granted?.origin.hops.at(-2)).toEqual(OriginHop.parse({ kind: 'choice', slot: CLASS_FEAT_SLOT }));
    expect(result.rollOptions).toContain(RollOption.parse('class-feat:sudden-charge'));
  });

  test('a pick the filter rules out is an error and the slot opens again', () => {
    const picks = [[CLASS_FEAT_SLOT, idOf('trick-attack')]] as const;
    const result = resolve([fighter(CLASS_FEAT), ...feats], { picks, level: 1 });
    expect(result.errors.map((error) => error.error)).toEqual([
      message(GrantsMessage.PickNotOffered, { entry: ContentText.parse('fighter'), value: idOf('trick-attack') }),
    ]);
    expect(result.open.map((slot) => slot.key)).toEqual([CLASS_FEAT_SLOT]);
    expect(result.items.map((item) => item.entry.id)).toEqual([idOf('fighter')]);
  });
});
