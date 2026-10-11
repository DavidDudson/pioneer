import { describe, expect, test } from 'bun:test';

import { expandLocalize, isLangKey, localize, mergeLang, UnresolvedTextReason } from './foundry-lang';
import type { FoundryLang } from './foundry-release';

const lang: FoundryLang = {
  PF2E: {
    TraitFire: 'Fire',
    Empty: '',
    SpecificRule: {
      Prompt: { Skill: 'Select a skill.' },
      PlayingItem: 'Playing {item}',
      ActorItem: '{actor} wields {item}',
      ScareToDeath: 'The target becomes @UUID[Compendium.pf2e.conditionitems.Item.x]{Frightened}.',
      Outer: 'Before @Localize[PF2E.TraitFire] after',
    },
  },
};
const values = { item: 'Lute' };

/** What `key` localizes to, unbranded for comparing. */
function localized(key: string): unknown {
  return localize(lang, key, values);
}

describe('isLangKey', () => {
  test.each(['PF2E.TraitFire', 'PF2E.SpecificRule.{actor|class.slug}.Note'])('%s is a key', (text) => {
    expect(isLangKey(text)).toBe(true);
  });

  test.each(['Fire', 'PF2E.', 'See PF2E.TraitFire', 'PF2E.Trait Fire', 'TYPES.Item.feat'])('%s is not', (text) => {
    expect(isLangKey(text)).toBe(false);
  });
});

describe('localize', () => {
  test('looks a key up', () => {
    expect(localized('PF2E.TraitFire')).toEqual({ text: 'Fire' });
  });

  test('follows nested keys', () => {
    expect(localized('PF2E.SpecificRule.Prompt.Skill')).toEqual({ text: 'Select a skill.' });
  });

  test("fills {item} with the document's name", () => {
    expect(localized('PF2E.SpecificRule.PlayingItem')).toEqual({ text: 'Playing Lute' });
  });

  test('reports a placeholder only play fills', () => {
    expect(localized('PF2E.SpecificRule.ActorItem')).toEqual({
      key: 'PF2E.SpecificRule.ActorItem',
      reason: UnresolvedTextReason.RuntimePlaceholder,
    });
  });

  test("leaves an enricher's label alone", () => {
    expect(localized('PF2E.SpecificRule.ScareToDeath')).toMatchObject({
      text: 'The target becomes @UUID[Compendium.pf2e.conditionitems.Item.x]{Frightened}.',
    });
  });

  test.each([
    ['a key with no text', 'PF2E.TraitNope'],
    ['a table, not a string', 'PF2E.SpecificRule.Prompt'],
    ['an empty string', 'PF2E.Empty'],
  ])('reports %s as missing', (_case, key) => {
    expect(localized(key)).toEqual({ key, reason: UnresolvedTextReason.MissingKey });
  });

  test('reports a key with an injected property, which only play builds', () => {
    const key = 'PF2E.SpecificRule.{actor|class.slug}.Note';

    expect(localized(key)).toEqual({ key, reason: UnresolvedTextReason.RuntimeKey });
  });
});

describe('expandLocalize', () => {
  test('inlines the text of each @Localize, ignoring its label', () => {
    expect(
      expandLocalize('<p>@Localize[PF2E.TraitFire]{Heat} and @Localize[PF2E.TraitFire]</p>', lang, values),
    ).toEqual({ text: '<p>Fire and Fire</p>', unresolved: [] });
  });

  test('expands @Localize in the inlined text', () => {
    expect(expandLocalize('@Localize[PF2E.SpecificRule.Outer]', lang, values).text).toBe('Before Fire after');
  });

  test('reports a key with no text, keeping its label or nothing', () => {
    expect(expandLocalize('<p>@Localize[PF2E.Nope]{Kept}@Localize[PF2E.Gone].</p>', lang, values)).toEqual({
      text: '<p>Kept.</p>',
      unresolved: [
        { key: 'PF2E.Nope', reason: UnresolvedTextReason.MissingKey },
        { key: 'PF2E.Gone', reason: UnresolvedTextReason.MissingKey },
      ],
    });
  });

  test('stops expanding at a depth, so a key inlining itself ends', () => {
    const loop: FoundryLang = { PF2E: { Loop: 'x @Localize[PF2E.Loop]' } };

    expect(expandLocalize('@Localize[PF2E.Loop]', loop, values).text).toBe('x x x x x @Localize[PF2E.Loop]');
  });
});

describe('mergeLang', () => {
  test('merges tables in order, a later string winning and nested tables merging', () => {
    expect(
      mergeLang([
        { PF2E: { TraitFire: 'Fire', Prompt: { Skill: 'Pick a skill' } } },
        { PF2E: { Prompt: { Skill: 'Select a skill.', Feat: 'Select a feat.' } } },
      ]),
    ).toEqual({ PF2E: { TraitFire: 'Fire', Prompt: { Skill: 'Select a skill.', Feat: 'Select a feat.' } } });
  });

  test('nests dotted keys, as Foundry expands them', () => {
    expect(mergeLang([{ PF2E: { TraitFire: 'Fire' } }, { 'PF2E.Kingmaker': { Camp: 'Camp' } }])).toEqual({
      PF2E: { TraitFire: 'Fire', Kingmaker: { Camp: 'Camp' } },
    });
  });

  test('a later table replaces a string with a table', () => {
    expect(mergeLang([{ PF2E: { Background: 'Background' } }, { PF2E: { Background: { Label: 'Bg' } } }])).toEqual({
      PF2E: { Background: { Label: 'Bg' } },
    });
  });
});
