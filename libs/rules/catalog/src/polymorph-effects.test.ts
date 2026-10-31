import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, contentKey, ContentKind, RuleElementKey, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, RuleElement } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

const POLYMORPH = Trait.parse('polymorph');
/** The name prefix of an effect, by the kinds of entry it is the effect of. */
const EFFECT_PREFIXES: readonly (readonly [string, readonly ContentKind[]])[] = [
  ['Spell Effect: ', [ContentKind.Spell]],
  ['Effect: ', [ContentKind.Feat, ContentKind.Action]],
];
const VARIANT_SUFFIX = / \([^)]*\)$/u;

/** The effects in `entries` of a polymorph spell, feat or action of the same pack that lack the trait, as keys. */
function untraited(entries: readonly ContentEntry[]): readonly string[] {
  const polymorph = new Set<string>(
    entries.filter(({ traits }) => traits.includes(POLYMORPH)).map(({ kind, name }) => `${kind}:${name}`),
  );
  return entries
    .filter(({ kind, name, traits }) => {
      const given = EFFECT_PREFIXES.find(([prefix]) => name.startsWith(prefix));
      if (kind !== ContentKind.Effect || given === undefined || traits.includes(POLYMORPH)) {
        return false;
      }
      const [prefix, kinds] = given;
      const source = name.slice(prefix.length).replace(VARIANT_SUFFIX, '');
      return kinds.some((each) => polymorph.has(`${each}:${source}`));
    })
    .map(({ pack, slug }) => contentKey(pack, slug));
}

describe('polymorph effects', () => {
  test('every effect of a polymorph spell, feat or action has the polymorph trait, so it replaces another form', async () => {
    const packs = await Promise.all(contentCatalog.map(async (loader) => loader.load()));
    const missing = packs.flatMap((pack) => untraited(pack.otherEntries));

    expect(missing).toEqual([]);
  });
});

/** The rule elements of a player-core effect, by slug. */
async function effectRules(slug: string): Promise<readonly RuleElement[]> {
  const file = await import('@pioneer/content/packs/player-core/effect.json');
  const effect = ContentEntryFile.parse(file.default).find(
    (entry) => entry.kind === ContentKind.Effect && entry.slug === slug,
  );
  return effect?.rules ?? [];
}

/** The rules of `slug` with `key`, ignoring battle forms and other keys. */
async function rulesOf(slug: string, key: RuleElementKey): Promise<readonly RuleElement[]> {
  const rules = await effectRules(slug);
  return rules.filter((rule) => rule.key === key);
}

/** The immunities `slug` gives, flattened. */
async function immunitiesOf(slug: string): Promise<readonly string[]> {
  const rules = await rulesOf(slug, RuleElementKey.Immunity);
  return rules.flatMap((rule) => (rule.key === RuleElementKey.Immunity ? rule.type : []));
}

/** The movement cost a player-core environment puts on the Speed: what each square costs more, and when it applies. */
async function movementCostOf(slug: string): Promise<readonly unknown[]> {
  const file = await import('@pioneer/content/packs/player-core/environment.json');
  const environment = ContentEntryFile.parse(file.default).find(
    (entry) => entry.kind === ContentKind.Environment && entry.slug === slug,
  );
  return (environment?.rules ?? []).flatMap((rule) =>
    rule.key === RuleElementKey.MovementCost ? [{ extra: rule.extra, predicate: rule.predicate }] : [],
  );
}

/** A player-core action entry, by slug; undefined when the pack has none. */
async function playerCoreAction(slug: string): Promise<ContentEntry | undefined> {
  const file = await import('@pioneer/content/packs/player-core/action.json');
  return ContentEntryFile.parse(file.default).find((entry) => entry.kind === ContentKind.Action && entry.slug === slug);
}

describe('polymorph effect gaps in Player Core', () => {
  test('difficult terrain costs 5 feet a square unless you are immune to it', async () => {
    const costs = await movementCostOf('environment:difficult-terrain');

    expect(costs).toEqual([{ extra: 5, predicate: [{ not: 'self:immunity:difficult-terrain' }] }]);
  });

  test('greater difficult terrain costs 10 feet a square unless you are immune to it', async () => {
    const costs = await movementCostOf('environment:greater-difficult-terrain');

    expect(costs).toEqual([{ extra: 10, predicate: [{ not: 'self:immunity:greater-difficult-terrain' }] }]);
  });

  test.each(['achaekek', 'cayden-cailean', 'erastil', 'gozreh', 'norgorber', 'shelyn', 'zon-kuthon'])(
    'Avatar (%s) is immune to difficult terrain and greater difficult terrain',
    async (deity) => {
      const immunities = await immunitiesOf(`effect:spell-effect-avatar-${deity}`);

      expect(immunities).toEqual(['difficult-terrain', 'greater-difficult-terrain']);
    },
  );

  test.each(['abadar', 'asmodeus', 'iomedae', 'torag'])(
    'Avatar (%s) is not immune to difficult terrain',
    async (deity) => {
      const immunities = await immunitiesOf(`effect:spell-effect-avatar-${deity}`);

      expect(immunities).not.toContain('difficult-terrain');
    },
  );

  test('One with Stone makes you Large', async () => {
    const [rule] = await rulesOf('effect:spell-effect-one-with-stone', RuleElementKey.CreatureSize);

    expect(rule).toMatchObject({ key: RuleElementKey.CreatureSize, value: 'large' });
  });

  test('One with Plants makes you Large unless Ritual Reversion is in effect', async () => {
    const [rule] = await rulesOf('effect:spell-effect-one-with-plants', RuleElementKey.CreatureSize);

    expect(rule).toMatchObject({ value: 'large', predicate: [{ not: 'self:effect:ritual-reversion' }] });
  });

  test('Ritual Reversion sets the option that keeps the size Small', async () => {
    const [rule] = await rulesOf('effect:effect-ritual-reversion', RuleElementKey.RollOption);

    expect(rule).toMatchObject({ option: 'self:effect:ritual-reversion' });
  });

  test('Insect Form (spider) grants the Web action, a two-action offensive ability', async () => {
    const [form] = await rulesOf('effect:spell-effect-insect-form-spider', RuleElementKey.BattleForm);
    const web = await playerCoreAction('action:insect-form-web');

    expect(form).toMatchObject({ form: { actions: [{ action: 'd2d52bf1-a10a-5ecf-bed8-b1effb3dd12d' }] } });
    expect(web).toMatchObject({ id: 'd2d52bf1-a10a-5ecf-bed8-b1effb3dd12d', data: { cost: 'two' } });
  });
});

/** The traits of a player-core effect, by slug; empty when the pack has no such effect. */
async function traitsOf(slug: string): Promise<readonly string[]> {
  const file = await import('@pioneer/content/packs/player-core/effect.json');
  const effect = ContentEntryFile.parse(file.default).find(
    (entry) => entry.kind === ContentKind.Effect && entry.slug === slug,
  );
  return effect?.traits ?? [];
}

describe('polymorph spells whose effect only replaces other forms', () => {
  test.each(['cursed-metamorphosis', 'disperse-into-air'])(
    'Spell Effect: %s has the polymorph trait',
    async (spell) => {
      expect(await traitsOf(`effect:spell-effect-${spell}`)).toContain('polymorph');
    },
  );
});
