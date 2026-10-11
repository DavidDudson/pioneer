import { describe, expect, test } from 'bun:test';

import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import type { FoundryLinks } from './enricher-context';
import { enrichedRun } from './translate-enricher';

const pack = PackId.parse('player-core');
const offGuard = ContentId.parse(contentId(pack, EntrySlug.parse('condition:off-guard')));
const trip = ContentId.parse(contentId(pack, EntrySlug.parse('action:trip')));
const OFF_GUARD_UUID = 'Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg';

const links: FoundryLinks = {
  entries: new Map([
    [OFF_GUARD_UUID, offGuard],
    ['Compendium.pf2e.conditionitems.Item.Off-Guard', offGuard],
  ]),
  names: new Map([
    [OFF_GUARD_UUID, 'Off-Guard'],
    ['Compendium.pf2e.spell-effects.Item.5MI4YKeDSBGLtqKM', 'Spell Effect: Bless'],
  ]),
  actions: new Map([['trip', trip]]),
  actionNames: new Map([
    ['trip', 'Trip'],
    ['grapple', 'Grapple'],
  ]),
};

interface Enriched {
  readonly run: unknown;
  readonly reported: string[];
}

function enriched(text: string): Enriched {
  const reported: string[] = [];
  const run = enrichedRun(text, {
    links,
    marks: [],
    report: (problem: string): void => {
      reported.push(problem);
    },
  });
  return { run, reported };
}

function runOf(text: string): unknown {
  return enriched(text).run;
}

function words(text: string): object {
  return { type: 'text', text, marks: [] };
}

describe('@UUID', () => {
  test('a link to an imported entry is a Ref, by document id or name', () => {
    expect(runOf(`@UUID[${OFF_GUARD_UUID}] or @UUID[Compendium.pf2e.conditionitems.Item.Off-Guard]`)).toEqual([
      { type: 'ref', id: offGuard },
      words(' or '),
      { type: 'ref', id: offGuard },
    ]);
  });

  test('keeps a label unless it only repeats the name', () => {
    expect(runOf(`@UUID[${OFF_GUARD_UUID}]{Off-Guard} @UUID[${OFF_GUARD_UUID}]{off-guard to you}`)).toEqual([
      { type: 'ref', id: offGuard },
      words(' '),
      { type: 'ref', id: offGuard, label: 'off-guard to you' },
    ]);
  });

  test('a target outside the import is its label, else its Foundry name, as text, reported by pack', () => {
    const { run, reported } = enriched(
      '@UUID[Compendium.pf2e.spell-effects.Item.5MI4YKeDSBGLtqKM]; @UUID[Compendium.pf2e.feats-srd.Item.Cobra Stance]; ' +
        '@UUID[Compendium.pf2e.journals.JournalEntry.45SK8rdbbxvEHfMn]{the rules}',
    );

    expect(run).toEqual([
      words('Spell Effect: Bless'),
      words('; '),
      words('Cobra Stance'),
      words('; '),
      words('the rules'),
    ]);
    expect(reported).toEqual(['@UUID[spell-effects]', '@UUID[feats-srd]', '@UUID[journals]']);
  });
});

describe('[[/act]]', () => {
  test('an imported action is a Ref; its options are reported', () => {
    const { run, reported } = enriched('[[/act trip]] [[/act trip dc=20]]{Trips}');

    expect(run).toEqual([{ type: 'ref', id: trip }, words(' '), { type: 'ref', id: trip, label: 'Trips' }]);
    expect(reported).toEqual(['[[/act]][dc]']);
  });

  test('an action outside the import is its label or name as text, reported', () => {
    const { run, reported } = enriched('[[/act grapple]] [[/act escape]]{Escapes} [[/act unknown-thing]]');

    expect(run).toEqual([words('Grapple'), words(' '), words('Escapes'), words(' '), words('unknown-thing')]);
    expect(reported).toEqual(['[[/act]]', '[[/act]]', '[[/act]]']);
  });
});

describe('@Check', () => {
  test('saves, skills, lores, perception and flat checks become selectors', () => {
    expect(
      runOf('@Check[reflex|basic] @Check[athletics|dc:20] @Check[warfare-lore] @Check[perception] @Check[flat|dc:5]'),
    ).toEqual([
      { type: 'check', statistic: 'save:reflex', basic: true },
      words(' '),
      { type: 'check', statistic: 'skill:athletics', dc: 20 },
      words(' '),
      { type: 'check', statistic: 'skill:lore:warfare' },
      words(' '),
      { type: 'check', statistic: 'perception' },
      words(' '),
      { type: 'check', statistic: 'flat', dc: 5 },
    ]);
  });

  test('against names the statistic whose DC it is', () => {
    const checks = runOf(
      '@Check[will|against:class-spell]@Check[fortitude|against:class]@Check[reflex|against:exemplar]' +
        '@Check[will|against:spell]@Check[athletics|defense:fortitude|rollerRole:target]@Check[type:will|against:perception]',
    );

    expect(checks).toEqual([
      { type: 'check', statistic: 'save:will', dc: { against: 'class-or-spell-dc' } },
      { type: 'check', statistic: 'save:fortitude', dc: { against: 'class-dc' } },
      { type: 'check', statistic: 'save:reflex', dc: { against: 'class-dc' } },
      { type: 'check', statistic: 'save:will', dc: { against: 'spell-dc' } },
      { type: 'check', statistic: 'skill:athletics', dc: { against: 'save:fortitude' } },
      { type: 'check', statistic: 'save:will', dc: { against: 'perception' } },
    ]);
  });

  test("a check the reader rolls against a target's DC keeps no DC, reported", () => {
    const { run, reported } = enriched(
      '@Check[athletics|defense:fortitude] @Check[will|against:class|rollerRole:origin]',
    );

    expect(run).toEqual([
      { type: 'check', statistic: 'skill:athletics' },
      words(' '),
      { type: 'check', statistic: 'save:will' },
    ]);
    expect(reported).toEqual(['@Check[against]', '@Check[against]']);
  });

  test('an adjustment is added to a fixed DC', () => {
    expect(runOf('@Check[athletics|dc:20|adjustment:2] @Check[flat|dc:11|adjustment:-1]')).toEqual([
      { type: 'check', statistic: 'skill:athletics', dc: 22 },
      words(' '),
      { type: 'check', statistic: 'flat', dc: 10 },
    ]);
  });

  test('keeps the label and namespaced options; ignores presentation parameters', () => {
    const { run, reported } = enriched('@Check[will|dc:20|showDC:all|name:Fear|options:origin:trait:fear]{DC 20 Will}');

    expect(run).toEqual([
      { type: 'check', statistic: 'save:will', dc: 20, options: ['origin:trait:fear'], label: 'DC 20 Will' },
    ]);
    expect(reported).toEqual([]);
  });

  test('reports what has no place in a Check, and drops it', () => {
    const { run, reported } = enriched(
      '@Check[athletics|basic|dc:@self.level|traits:fear|options:area-effect] @Check[will|against:occult]',
    );

    expect(run).toEqual([
      { type: 'check', statistic: 'skill:athletics' },
      words(' '),
      { type: 'check', statistic: 'save:will' },
    ]);
    expect(reported.toSorted()).toEqual([
      '@Check[against:occult]',
      '@Check[basic]',
      '@Check[dc]',
      '@Check[options]',
      '@Check[traits]',
    ]);
  });

  test('a statistic with no selector is its label, else its words, as text', () => {
    const { run, reported } = enriched('@Check[deviant|dc:20] @Check[class]{DC 30 class check}');

    expect(run).toEqual([words('Deviant'), words(' '), words('DC 30 class check')]);
    expect(reported).toEqual(['@Check[type:deviant]', '@Check[type:class]']);
  });
});

describe('@Damage', () => {
  test('instances with types and categories, persistent and splash included', () => {
    expect(runOf('@Damage[2d6[fire],1d6[persistent,fire]] @Damage[(1[splash])[acid]]{1 acid splash}')).toEqual([
      {
        type: 'damage',
        instances: [
          { formula: '2d6', damageType: 'fire' },
          { formula: '1d6', damageType: 'fire', category: 'persistent' },
        ],
      },
      words(' '),
      { type: 'damage', instances: [{ formula: '1', damageType: 'acid', category: 'splash' }], label: '1 acid splash' },
    ]);
  });

  test('healing, untyped damage, and references in Pioneer spelling', () => {
    expect(runOf('@Damage[(2*@actor.level)[healing]] @Damage[(@item.level)d4[untyped]]')).toEqual([
      { type: 'damage', instances: [{ formula: '2*@level' }], healing: true },
      words(' '),
      { type: 'damage', instances: [{ formula: '(@item.level)d4' }] },
    ]);
  });

  test('an untranslatable reference or type keeps the label, else the formula, as text', () => {
    const { run, reported } = enriched(
      '@Damage[(1d4+@item.system.damage.dice)[persistent,poison]]{1d4 + dice} @Damage[1d6[@item.system.damage.damageType]]',
    );

    expect(run).toEqual([words('1d4 + dice'), words(' '), words('1d6[@item.system.damage.damageType]')]);
    expect(reported).toEqual(['@Damage[formula]', '@Damage[type:@item.system.damage.damageType]']);
  });

  test("a splash marker on part of a formula is not read as the whole instance's category", () => {
    const { run, reported } = enriched('@Damage[(2d6+(1[splash]))[fire]]{2d6 fire and 1 splash}');

    expect(run).toEqual([words('2d6 fire and 1 splash')]);
    expect(reported).toEqual(['@Damage[formula]']);
  });

  test('healing mixed with damage stays text; options are reported', () => {
    const { run, reported } = enriched('@Damage[1d6[healing],1d6[void]] @Damage[6d6[fire]|options:area-damage]');

    expect(run).toEqual([
      words('1d6[healing],1d6[void]'),
      words(' '),
      { type: 'damage', instances: [{ formula: '6d6', damageType: 'fire' }] },
    ]);
    expect(reported).toEqual(['@Damage[formula]', '@Damage[options]']);
  });
});

describe('@Template', () => {
  test('a shape and size, by position or name; a line keeps its width; the label goes', () => {
    expect(runOf('@Template[cone|distance:15] @Template[type:line|distance:120|width:10]{120-foot lines}')).toEqual([
      { type: 'template', shape: 'cone', size: 15 },
      words(' '),
      { type: 'template', shape: 'line', size: 120, width: 10 },
    ]);
  });

  test('a shape Pioneer lacks stays text; a width off a line is reported and dropped', () => {
    const { run, reported } = enriched('@Template[square|distance:10] @Template[burst|distance:20|width:5]');

    expect(run).toEqual([words('10-foot square'), words(' '), { type: 'template', shape: 'burst', size: 20 }]);
    expect(reported).toEqual(['@Template[type:square]', '@Template[width]']);
  });
});

describe('inline rolls', () => {
  test('a typed roll is damage; a whole number of a time unit is a duration', () => {
    expect(runOf('[[/r 2d6[fire]]] [[/gmr 1 #minute]] [[/r 3 #Rounds]]{3 rounds}')).toEqual([
      { type: 'damage', instances: [{ formula: '2d6', damageType: 'fire' }] },
      words(' '),
      { type: 'duration', count: 1, unit: 'minute' },
      words(' '),
      { type: 'duration', count: 3, unit: 'round' },
    ]);
  });

  test('any other roll reads as its label, else its formula, unreported', () => {
    const { run, reported } = enriched('[[/r 1d4 #rounds]]{1d4 rounds} [[/r 1d20+13 #Counteract]]{+13} [[/br 1d4]]');

    expect(run).toEqual([words('1d4 rounds'), words(' '), words('+13'), words(' '), words('1d4')]);
    expect(reported).toEqual([]);
  });

  test('a roll reading the actor or item is reported, whatever its label', () => {
    const { run, reported } = enriched('[[/r 1d20+@actor.level]] [[/r 1+@actor.abilities.str.mod]]{feet}');

    expect(run).toEqual([words('1d20+@actor.level'), words(' '), words('feet')]);
    expect(reported).toEqual(['[[/r]][formula]', '[[/r]][formula]']);
  });
});

describe('other enrichers', () => {
  test('@Embed and @Localize are reported and leave only a label', () => {
    const { run, reported } = enriched(
      'A @Embed[Compendium.pf2e.classfeatures.Item.l3X6D8uMlt2y6vGS inline] B @Localize[PF2E.x]{y} [[/unknown z]]',
    );

    expect(run).toEqual([words('A '), words(' B '), words('y'), words(' '), words('z')]);
    expect(reported).toEqual(['@Embed', '@Localize', '[[/unknown]]']);
  });
});
