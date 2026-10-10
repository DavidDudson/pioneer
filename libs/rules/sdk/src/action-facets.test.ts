import { describe, expect, test } from 'bun:test';

import { ACTION_FACETS, FEAT_FACETS } from './action-facets';
import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { COMMON_FACETS, facetValues, UNKNOWN } from './facet';
import type { FacetDefinition } from './facet';
import { filterEntries } from './facet-filter';
import { filterFromQuery } from './filter-query';
import { facetsFor } from './kind-facets';

const PACK = 'player-core';
const prose = [{ type: 'paragraph', content: [{ type: 'text', text: 'An entry.' }] }];
const idOf = (slug: string): string => contentId(PackId.parse(PACK), Slug.parse(slug));

interface EntryFields {
  readonly kind: string;
  readonly slug: string;
  readonly data: object;
  readonly traits?: readonly string[];
  readonly level?: number;
}

/** A Player Core entry. */
function entry({ traits = [], ...fields }: EntryFields): ContentEntry {
  return ContentEntry.parse({
    id: idOf(fields.slug),
    pack: PACK,
    name: fields.slug,
    rarity: 'common',
    traits,
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: prose,
    rules: [],
    ...fields,
  });
}

const feat = (slug: string, data: object, traits: readonly string[]): ContentEntry =>
  entry({ kind: 'feat', slug, data, traits, level: 1 });
const action = (slug: string, data: object, traits: readonly string[] = []): ContentEntry =>
  entry({ kind: 'action', slug, data, traits });

/** Every facet's values for `entry`, keyed by facet id. */
function valuesOf(facets: readonly FacetDefinition[], subject: ContentEntry): Record<string, readonly string[]> {
  return Object.fromEntries(facets.map((facet) => [facet.id, facetValues(subject, facet)]));
}

const feats = (subject: ContentEntry): Record<string, readonly string[]> => valuesOf(FEAT_FACETS, subject);
const actions = (subject: ContentEntry): Record<string, readonly string[]> => valuesOf(ACTION_FACETS, subject);
const slugs = (entries: readonly ContentEntry[]): readonly string[] => entries.map((each) => each.slug);

const suddenCharge = feat('sudden-charge', { category: 'class', action: { cost: 'two' } }, ['fighter', 'flourish']);
const assurance = feat('assurance', { category: 'skill', skills: ['skill:athletics'] }, ['general', 'skill']);
const additionalLore = feat('additional-lore', { category: 'skill' }, ['general', 'skill']);
const toughness = feat('toughness', { category: 'general' }, ['general']);
const battleMedicine = feat(
  'battle-medicine',
  { category: 'skill', action: { cost: 'one', skills: ['skill:medicine'] } },
  ['general', 'healing', 'manipulate', 'skill'],
);
const fighterDedication = feat('fighter-dedication', { category: 'class', archetype: idOf('fighter-archetype') }, [
  'archetype',
  'dedication',
  'multiclass',
]);
const unplacedArchetypeFeat = feat('basic-maneuver', { category: 'class' }, ['archetype']);
/** Skills on the feat and on its action, overlapping. */
const shieldPush = feat(
  'shield-push',
  {
    category: 'class',
    skills: ['skill:athletics'],
    action: { cost: 'one', skills: ['skill:athletics', 'skill:intimidation'] },
  },
  ['fighter'],
);

const climb = action('climb', { cost: 'one', skills: ['skill:athletics'] }, ['move']);
const aid = action('aid', { cost: 'reaction', trigger: prose });
const elementalBlast = action('elemental-blast', { cost: 'one', upTo: 2 }, ['attack', 'impulse']);
const avoidNotice = action('avoid-notice', {}, ['exploration']);
const earnIncome = action('earn-income', { skills: ['skill:crafting', 'skill:lore-sailing'] }, ['downtime', 'skill']);
const treatDisease = action('treat-disease', {}, ['downtime', 'manipulate', 'skill']);
const fireball = entry({
  kind: 'spell',
  slug: 'fireball',
  data: { rank: 3, traditions: ['arcane'], time: { type: 'actions', cost: 'two' }, damage: [] },
});

describe('feat facets', () => {
  test('Sudden Charge', () => {
    expect(feats(suddenCharge)).toStrictEqual({
      'feat-category': ['class'],
      'action-cost': ['two'],
      archetype: [],
      skill: ['none'],
    });
  });

  test('a passive feat costs nothing to use', () => {
    expect([toughness, assurance].map((each) => feats(each)['action-cost'])).toStrictEqual([['passive'], ['passive']]);
  });

  test("skills: the feat's own and its action's, unknown for a skill feat naming none", () => {
    expect([assurance, battleMedicine, additionalLore, toughness].map((each) => feats(each)['skill'])).toStrictEqual([
      ['athletics'],
      ['medicine'],
      [UNKNOWN],
      ['none'],
    ]);
  });

  test("a feat's skills and its action's merge, each once", () => {
    expect(feats(shieldPush)['skill']).toStrictEqual(['athletics', 'intimidation']);
  });

  test('archetype: the one named, unknown for an archetype feat naming none', () => {
    expect(feats(fighterDedication)['archetype']).toStrictEqual([idOf('fighter-archetype')]);
    expect(feats(unplacedArchetypeFeat)['archetype']).toStrictEqual([UNKNOWN]);
  });
});

describe('action facets', () => {
  test('Climb', () => {
    expect(actions(climb)).toStrictEqual({ 'action-cost': ['one'], mode: ['encounter'], skill: ['athletics'] });
  });

  test('costs: glyphs, variable and passive', () => {
    expect([aid, elementalBlast, avoidNotice].map((each) => actions(each)['action-cost'])).toStrictEqual([
      ['reaction'],
      ['variable'],
      ['passive'],
    ]);
  });

  test('mode comes from the exploration and downtime traits', () => {
    expect([aid, avoidNotice, earnIncome].map((each) => actions(each)['mode'])).toStrictEqual([
      ['encounter'],
      ['exploration'],
      ['downtime'],
    ]);
  });

  test('every Lore is one skill; a skill action naming none is unknown', () => {
    expect(actions(earnIncome)['skill']).toStrictEqual(['crafting', 'lore']);
    expect(actions(treatDisease)['skill']).toStrictEqual([UNKNOWN]);
    expect(actions(aid)['skill']).toStrictEqual(['none']);
  });

  test('a selector naming no listed skill is unknown', () => {
    const unlisted = action('unlisted', { skills: ['skill:none', 'skill:foo'] }, ['skill']);

    expect(actions(unlisted)['skill']).toStrictEqual([UNKNOWN]);
  });
});

describe('a mixed list', () => {
  const list = [suddenCharge, battleMedicine, climb, aid, elementalBlast, fireball];
  const facets = facetsFor(['feat', 'action', 'spell']);

  test('feats and actions share the action cost and skill facets', () => {
    expect(facetsFor(['feat', 'action']).map((facet): string => facet.id)).toStrictEqual([
      ...COMMON_FACETS.map((facet) => facet.id),
      'feat-category',
      'action-cost',
      'archetype',
      'skill',
      'mode',
    ]);
  });

  test('an action cost keeps feats and actions alike, and no spell', () => {
    const kept = slugs(filterEntries(list, facets, filterFromQuery({ 'f.action-cost': 'one' }, facets)));

    expect(kept).toStrictEqual(['battle-medicine', 'climb']);
  });

  test('a mode keeps only actions', () => {
    const kept = slugs(filterEntries(list, facets, filterFromQuery({ 'f.mode': 'encounter' }, facets)));

    expect(kept).toStrictEqual(['climb', 'aid', 'elemental-blast']);
  });
});
