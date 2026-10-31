import { describe, expect, test } from 'bun:test';

import { DefenceStatusKind, RuleInPlay } from '@pioneer/rules/engine';
import {
  contentPackFromContents,
  MagicTradition,
  OriginHopKind,
  RuleElementKey,
  Size,
  SpellRank,
} from '@pioneer/rules/sdk';

import { playerCorePack } from './json-packs';
import { chosen, effectRulesOf, formRulesOf, viewOf } from './testing/battle-forms';
import type { FormView } from './testing/battle-forms';

const LEVEL = 10;

/** The druid in Dragon Form as the dragon `type` (the pick of its Dragon Form spell), cast at `rank`. */
function dragon(type: string, rank: number): FormView {
  return viewOf(formRulesOf('effect:spell-effect-dragon-form', rank), chosen(`dragon-form:${type}`));
}

function resistances(view: FormView): unknown {
  return view.defences.resistances
    .filter(({ status }) => status.kind === DefenceStatusKind.Applied)
    .map(({ type, value }) => [type, value]);
}

describe('Player Core: Dragon Form, level 10 druid', () => {
  test('6th rank brine dragon: Large, AC 18 + level, 10 temporary HP, Athletics +23, Speed 40, fly 100, swim 60', () => {
    const form = dragon('brine', 6);

    expect(form.size).toBe(Size.Large);
    expect(form.total('ac')).toBe(18 + LEVEL);
    expect(form.temporaryHitPoints).toBe(10);
    expect(form.total('skill:athletics')).toBe(23);
    expect(form.total('speed:land')).toBe(40);
    expect(form.total('speed:fly')).toBe(100);
    expect(form.total('speed:swim')).toBe(60);
  });

  test('the dragon type gives its resistance and the speeds that type has, and no others', () => {
    expect(resistances(dragon('brine', 6))).toEqual([['bludgeoning', 10]]);
    expect(resistances(dragon('magma', 6))).toEqual([['fire', 10]]);
    expect(dragon('magma', 6).total('speed:burrow')).toBe(20);
    expect(dragon('magma', 6).total('speed:swim')).toBe(0);
    expect(dragon('cinder', 6).total('speed:burrow')).toBe(0);
  });

  test('8th rank: Huge, 15 temporary HP, Athletics +28, fly 120, and the type’s speeds stay', () => {
    const form = dragon('magma', 8);

    expect(form.size).toBe(Size.Huge);
    expect(form.temporaryHitPoints).toBe(15);
    expect(form.total('skill:athletics')).toBe(28);
    expect(form.total('speed:fly')).toBe(120);
    expect(form.total('speed:burrow')).toBe(20);
    expect(resistances(form)).toEqual([['fire', 10]]);
  });

  test('without a pick the form has the speeds and resistance of no dragon type', () => {
    const form = viewOf(formRulesOf('effect:spell-effect-dragon-form', 6), chosen());

    expect(resistances(form)).toEqual([]);
    expect(form.total('speed:swim')).toBe(0);
  });
});

/** The dice the jaws add to their 2d12 piercing, for the dragon `type` at `rank`: every rule of the effect is in play. */
function jawsExtra(type: string, rank: number): unknown {
  const view = viewOf(effectRulesOf('effect:spell-effect-dragon-form', rank), chosen(`dragon-form:${type}`));
  const jaws = view.strikes.find(({ weapon }) => String(weapon.slug) === 'jaws');
  return jaws?.damage?.extra.map(({ count, die, damageType }) => [count, die, damageType]);
}

describe('Player Core: Dragon Form, the jaws', () => {
  test('the jaws deal 2d6 more damage of the type of the dragon’s breath, and of that type only', () => {
    expect(jawsExtra('magma', 6)).toEqual([[2, 'd6', 'fire']]);
    expect(jawsExtra('brine', 6)).toEqual([[2, 'd6', 'bludgeoning']]);
    expect(jawsExtra('rime', 6)).toEqual([[2, 'd6', 'cold']]);
    expect(jawsExtra('umbral', 6)).toEqual([[2, 'd6', 'void']]);
  });

  test('without a pick the jaws add no dice', () => {
    const view = viewOf(effectRulesOf('effect:spell-effect-dragon-form', 6), chosen());
    const jaws = view.strikes.find(({ weapon }) => String(weapon.slug) === 'jaws');

    expect(jaws?.damage?.extra).toEqual([]);
  });
});

/** `names` in code-unit order, never the host's locale. */
function ordered(names: readonly string[]): readonly string[] {
  return names.toSorted((left, right) => Number(left > right) - Number(left < right));
}

/** A predicate test that holds when any of its options does. */
interface AnyOf {
  readonly or: readonly unknown[];
}

function isAnyOf(check: unknown): check is AnyOf {
  return typeof check === 'object' && check !== null && 'or' in check && Array.isArray(check.or);
}

/** The dragons the test `check` of a predicate names: one roll option, or an `or` of them. */
function dragonsOf(check: unknown): readonly string[] {
  const options: readonly unknown[] = isAnyOf(check) ? check.or : [check];
  return options.map((option) => String(option).slice('dragon-form:'.length));
}

/** The dragons the pick of Dragon Form offers, by their roll option. */
function dragonsOfPick(): readonly string[] {
  return effectRulesOf('effect:spell-effect-dragon-form', 6).flatMap(({ element }) =>
    element.key === RuleElementKey.ChoiceSet && Array.isArray(element.choices)
      ? element.choices.map(({ value }) => String(value))
      : [],
  );
}

const TRADITION_OPTION = 'dragon-form-tradition:';

/** The dragons each tradition roll option of the effect is switched on by. */
function traditionOf(): ReadonlyMap<string, readonly string[]> {
  const found = new Map<string, readonly string[]>();
  for (const { element } of effectRulesOf('effect:spell-effect-dragon-form', 6)) {
    if (element.key === RuleElementKey.RollOption && element.option.startsWith(TRADITION_OPTION)) {
      found.set(element.option.slice(TRADITION_OPTION.length), dragonsOf(element.predicate?.[0]));
    }
  }
  return found;
}

describe('Player Core: Dragon Form, the dragon’s tradition', () => {
  test('each of the four traditions is a roll option for the dragons that have it', () => {
    const traditions = traditionOf();

    expect(ordered([...traditions.keys()])).toEqual(['arcane', 'divine', 'occult', 'primal']);
    expect(traditions.get('primal')).toContain('brine');
    expect(traditions.get('arcane')).toContain('mirage');
    expect(traditions.get('divine')).toContain('delight');
    expect(traditions.get('occult')).toContain('conspirator');
  });

  test('every dragon of the pick is in exactly one tradition', () => {
    const dragons = dragonsOfPick();
    const listed = [...traditionOf().values()].flat();

    expect(dragons).toHaveLength(40);
    expect(ordered(listed)).toEqual(ordered(dragons));
  });
});

const PLAYER_CORE_ENTRIES = contentPackFromContents(await playerCorePack()).otherEntries;

/** The slugs of the entries the effect grants while it lasts. */
function grantedSlugs(): readonly string[] {
  return effectRulesOf('effect:spell-effect-dragon-form', 6).flatMap(({ element }) => {
    const granted =
      element.key === RuleElementKey.GrantItem && typeof element.item === 'string'
        ? PLAYER_CORE_ENTRIES.find(({ id }) => id === element.item)
        : undefined;
    return granted === undefined ? [] : [String(granted.slug)];
  });
}

describe('Player Core: Dragon Form, the breath', () => {
  test('the form grants the Dragon Breath action', () => {
    expect(grantedSlugs()).toEqual(['action:dragon-breath-dragon-form']);
  });
});

/** The effect's rules as an effect cast at the 6th rank by a spellcasting entry of `tradition` puts them in play. */
function castBy(tradition: MagicTradition): readonly RuleInPlay[] {
  return effectRulesOf('effect:spell-effect-dragon-form', 6).map(({ element, origin, rule, itemLevel }) =>
    RuleInPlay.parse({
      element,
      origin: {
        ...origin,
        hops: [{ kind: OriginHopKind.Effect, effect: origin.entry, rank: SpellRank.parse(6), tradition }],
      },
      rule,
      itemLevel,
    }),
  );
}

describe('Player Core: Dragon Form, the tradition it was cast with', () => {
  test('a divine dragon cast by a divine caster resists spirit, void and vitality 10', () => {
    const form = viewOf(castBy(MagicTradition.Divine), chosen('dragon-form:delight', 'dragon-form-tradition:divine'));

    expect(resistances(form)).toEqual(
      expect.arrayContaining([
        ['spirit', 10],
        ['void', 10],
        ['vitality', 10],
      ]),
    );
  });

  test('cast by a caster of another tradition, the dragon has no resistance of its own tradition', () => {
    const form = viewOf(castBy(MagicTradition.Primal), chosen('dragon-form:delight', 'dragon-form-tradition:divine'));

    expect(resistances(form)).not.toContainEqual(['void', 10]);
  });

  test('a primal dragon cast by a primal caster resists physical 5', () => {
    const form = viewOf(castBy(MagicTradition.Primal), chosen('dragon-form:brine', 'dragon-form-tradition:primal'));

    expect(resistances(form)).toContainEqual(['physical', 5]);
  });
});
