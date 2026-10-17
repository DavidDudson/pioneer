import { PackId, RuleElementKey } from '@pioneer/rules/sdk';

import { spellId } from './focus-plan';

/**
 * The innate entries and innate spells of Player Core's ancestry and archetype feats that teach them, as
 * `SpellcastingEntry` elements with preparation `innate` and `InnateSpells` elements by the entry slug they go on
 * (ADR-0067). Foundry grants no innate spell by rule element: the player drags each into an innate entry by hand, and
 * Fey Influence's `ChoiceSet` picks an animal whose spell nothing grants. The importer adds them from the feats' text,
 * with the spells in Player Core, at `pf2e-8.6.0`; a later book's innate feats are added with its import.
 */

const CANTRIP = 'cantrip';
const SELF_LEVEL = 'self:level';
/** Where the spells of the feats below are printed, whichever book the feat is in. */
const PRINTED_IN = PackId.parse('player-core');

/** The rank an innate spell is cast at: a cantrip, or 1 to 10. */
type InnateRank = number | typeof CANTRIP;

/** A spell by slug (or `<book>/<slug>` for another book's) and the rank it is cast at. */
type InnateSpell = readonly [spell: string, rank: InnateRank];

function entry(slug: string, tradition: string, attribute: string, predicate?: readonly unknown[]): object {
  return {
    key: RuleElementKey.SpellcastingEntry,
    slug,
    tradition,
    attribute,
    preparation: 'innate',
    ...(predicate === undefined ? {} : { predicate }),
  };
}

function innate(slug: string, spells: readonly InnateSpell[], predicate?: readonly unknown[]): object {
  return {
    key: RuleElementKey.InnateSpells,
    entry: slug,
    spells: spells.map(([spell, rank]) => ({ rank, spell: spellId(PRINTED_IN, spell) })),
    ...(predicate === undefined ? {} : { predicate }),
  };
}

/** A `ChoiceSet` under `flag` whose pick becomes the roll option `<flag>:<value>`. */
function choice(flag: string, prompt: string, options: readonly (readonly [value: string, label: string])[]): object {
  return {
    key: RuleElementKey.ChoiceSet,
    flag,
    rollOption: flag,
    prompt,
    choices: options.map(([value, label]) => ({ value, label })),
  };
}

/** The levels a rank holds from `from`, to the level before the next range's `from`; the last holds on. */
type LevelRanks = readonly (readonly [from: number, rank: number])[];

function levelRange([from, rank]: LevelRanks[number], next: LevelRanks[number] | undefined): readonly unknown[] {
  const atLeast = { gte: [SELF_LEVEL, from] };
  return [next === undefined ? atLeast : { and: [atLeast, { lt: [SELF_LEVEL, next[0]] }] }];
}

/** `spell` at the rank each range of levels gives, one element per range, each holding while the extra `when` does. */
function byLevel(slug: string, spell: string, ranks: LevelRanks, when: readonly unknown[] = []): object[] {
  return ranks.map((each, index) => {
    const [range] = levelRange(each, ranks[index + 1]);
    return innate(slug, [[spell, each[1]]], [...when, range]);
  });
}

const FEY_INFLUENCE = 'fey-influence';
const FEY_ASCENSION = 'fey-ascension';
const FEY_PICK = 'Select a feature.';

/** Fey Influence's animals or fey types, and the 1st-rank spell each gives. */
const FEY_ANIMALS: readonly (readonly [value: string, label: string, spell: string])[] = [
  ['anteater', 'Anteater', 'grim-tendrils'],
  ['cat-sith', 'Cat Sith', 'pest-form'],
  ['cursed-bluebird', 'Cursed Bluebird', 'ill-omen'],
  ['dryad', 'Dryad', 'summon-plant-or-fungus'],
  ['faun', 'Faun', 'fleet-step'],
  ['gremlin', 'Gremlin', 'bane'],
  ['monarch', 'Monarch', 'spider-sting'],
  ['unicorn', 'Unicorn', 'heal'],
];

/** The spells Fey Ascension gives the animal Fey Influence picked, at the rank each is cast at. */
const FEY_ASCENSIONS: ReadonlyMap<string, readonly InnateSpell[]> = new Map([
  ['anteater', [['slow', 3]]],
  ['cursed-bluebird', [['pest-form', 4]]],
  [
    'faun',
    [
      ['charm', 1],
      ['sleep', 1],
      ['triple-time', 2],
    ],
  ],
  ['gremlin', [['mad-monkeys', 3]]],
]);

/**
 * Grown of Oak casts Oaken Resilience at will at one rank below the highest a druid casts: a druid's highest rank is half
 * the level rounded up, to 9.
 */
const GROWN_OF_OAK_RANKS: LevelRanks = [
  [6, 2],
  [7, 3],
  [9, 4],
  [11, 5],
  [13, 6],
  [15, 7],
  [17, 8],
];

/** Mortal Herald's Heal or Harm is heightened to half the level rounded up, from the dedication's 12th level. */
const MORTAL_HERALD_RANKS: LevelRanks = [
  [12, 6],
  [13, 7],
  [15, 8],
  [17, 9],
  [19, 10],
];
const VOID_HEALING = 'deity:primary:font:harm';

const DREAM_MAGIC = 'dream-magic';
const DREAM_RANK = 4;

/** The innate entry, choices and `InnateSpells` elements each feat gains, by its entry slug. */
const INNATE: ReadonlyMap<string, readonly object[]> = new Map([
  [
    'feat:fey-influence',
    [
      entry(FEY_INFLUENCE, 'primal', 'cha'),
      choice(
        FEY_INFLUENCE,
        FEY_PICK,
        FEY_ANIMALS.map(([value, label]) => [value, label]),
      ),
      ...FEY_ANIMALS.map(([value, , spell]) => innate(FEY_INFLUENCE, [[spell, 1]], [`${FEY_INFLUENCE}:${value}`])),
    ],
  ],
  [
    'feat:fey-ascension',
    [
      entry(FEY_ASCENSION, 'primal', 'cha', [
        { or: [...FEY_ASCENSIONS.keys()].map((value) => `${FEY_INFLUENCE}:${value}`) },
      ]),
      ...[...FEY_ASCENSIONS].map(([value, spells]) => innate(FEY_ASCENSION, spells, [`${FEY_INFLUENCE}:${value}`])),
    ],
  ],
  [
    'feat:grown-of-oak',
    [entry('grown-of-oak', 'primal', 'wis'), ...byLevel('grown-of-oak', 'oaken-resilience', GROWN_OF_OAK_RANKS)],
  ],
  [
    'feat:dream-magic',
    [
      entry(DREAM_MAGIC, 'occult', 'wis'),
      choice(DREAM_MAGIC, 'Select a spell.', [
        ['dream-message', 'Dream Message'],
        ['sleep', 'Sleep'],
      ]),
      innate(DREAM_MAGIC, [['dream-message', DREAM_RANK]], [`${DREAM_MAGIC}:dream-message`]),
      innate(DREAM_MAGIC, [['sleep', DREAM_RANK]], [`${DREAM_MAGIC}:sleep`]),
    ],
  ],
  [
    'feat:mortal-herald-dedication',
    [
      entry('mortal-herald', 'divine', 'cha'),
      ...byLevel('mortal-herald', 'heal', MORTAL_HERALD_RANKS, [{ not: VOID_HEALING }]),
      ...byLevel('mortal-herald', 'harm', MORTAL_HERALD_RANKS, [VOID_HEALING]),
    ],
  ],
]);

/** The innate entry, choices and `InnateSpells` elements the entry with `slug` gains if any. */
export function innateSpellRules(slug: string): readonly object[] {
  return INNATE.get(slug) ?? [];
}
