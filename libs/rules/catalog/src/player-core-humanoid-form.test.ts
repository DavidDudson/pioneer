import { describe, expect, test } from 'bun:test';

import { resolveGrants, toggleKeyOf } from '@pioneer/rules/grants';
import type { GrantEntry, GrantResolution, ToggleStates } from '@pioneer/rules/grants';
import { lookupOf } from '@pioneer/rules/grants/testing';
import type { ToggleKey } from '@pioneer/rules/sdk';
import {
  contentPackFromContents,
  Level,
  OriginHopKind,
  RollOption,
  RuleElementKey,
  RuleIndex,
  Size,
  Slug,
  slugName,
  SpellRank,
} from '@pioneer/rules/sdk';

import { playerCorePack } from './json-packs';
import { chosen, effectRulesOf, viewOf } from './testing/battle-forms';
import { coreNamespaces } from './testing/fighter';

const SLUG = 'effect:spell-effect-humanoid-form';
const RANK = 2;

const PLAYER_CORE_EFFECTS = contentPackFromContents(await playerCorePack()).otherEntries;

/** The committed Humanoid Form, as grants read an entry. */
function humanoidForm(): GrantEntry {
  const found = PLAYER_CORE_EFFECTS.find((each) => each.slug === SLUG);
  if (found === undefined) {
    throw new Error(`${SLUG} is not in the player-core effects`);
  }
  const [first, ...rest] = found.sources;
  if (first === undefined) {
    throw new Error(`${SLUG} has no source`);
  }
  return {
    id: found.id,
    kind: found.kind,
    slug: slugName(found.slug),
    name: found.name,
    rules: found.rules,
    sources: [first, ...rest],
    rollOptions: [],
  };
}

/** The index of the toggleable `RollOption` that sets `option`. */
function toggleIndex(entry: GrantEntry, option: string): number {
  return entry.rules.findIndex((rule) => rule.key === RuleElementKey.RollOption && rule.option === option);
}

describe('Player Core: Humanoid Form, level 10 druid', () => {
  test.each([
    ['small', Size.Small],
    ['medium', Size.Medium],
    ['large', Size.Large],
  ])('the %s humanoid has that size', (pick, size) => {
    const form = viewOf(effectRulesOf(SLUG, RANK), chosen(`humanoid-form:${pick}`));

    expect(form.size).toBe(size);
  });

  test('a form that is no battle form replaces no statistic and gives no Strikes', () => {
    const form = viewOf(effectRulesOf(SLUG, RANK), chosen('humanoid-form:medium'));

    expect(form.total('ac')).toBe(25);
    expect(form.strikes.map(({ weapon }) => String(weapon.slug))).toEqual(['fist']);
  });

  test('Deception gets the status bonus and the level while passing as a humanoid, and not otherwise', () => {
    const off = viewOf(effectRulesOf(SLUG, RANK), chosen('humanoid-form:medium'));
    const on = viewOf(effectRulesOf(SLUG, RANK), chosen('humanoid-form:medium', 'option:pass-as-humanoid'));

    expect(on.total('skill:deception') - off.total('skill:deception')).toBe(4 + 10);
  });

  test('a sense is added only for the one picked', () => {
    const none = viewOf(effectRulesOf(SLUG, RANK), chosen('humanoid-form:medium'));
    const dark = viewOf(
      effectRulesOf(SLUG, RANK),
      chosen('humanoid-form:medium', 'option:humanoid-form-sense:darkvision'),
    );

    expect(none.senses).toHaveLength(0);
    expect(dark.senses).toHaveLength(1);
  });
});

describe('Player Core: Humanoid Form in the grants', () => {
  const effect = humanoidForm();
  const toggleAt = (option: string): ToggleKey => toggleKeyOf(effect.id, RuleIndex.parse(toggleIndex(effect, option)));

  function resolved(toggles: ToggleStates, rank = RANK): GrantResolution {
    return resolveGrants({
      roots: [
        { entry: effect.id, hop: { kind: OriginHopKind.Effect, effect: effect.id, rank: SpellRank.parse(rank) } },
      ],
      lookup: lookupOf([effect]),
      level: Level.parse(10),
      situation: [RollOption.parse('humanoid-form:large')],
      picks: new Map(),
      toggles,
      rootSlots: [],
      namespaces: coreNamespaces(),
    });
  }

  test('the humanoid trait and the picked form are roll options, and the toggles start off', () => {
    const { facts } = resolved(new Map());

    expect(facts.has('self:trait:humanoid')).toBe(true);
    expect(facts.has('humanoid-form:large')).toBe(true);
    expect(facts.has('option:pass-as-humanoid')).toBe(false);
  });

  test('turning on passing as a humanoid, and a sense at rank 3, sets their roll options', () => {
    const { facts } = resolved(
      new Map([
        [toggleAt('option:pass-as-humanoid'), { on: true, suboption: undefined }],
        [toggleAt('option:humanoid-form-sense'), { on: true, suboption: Slug.parse('darkvision') }],
      ]),
      3,
    );

    expect(facts.has('option:pass-as-humanoid')).toBe(true);
    expect(facts.has('option:humanoid-form-sense:darkvision')).toBe(true);
  });

  test('a sense is not offered below rank 3, even switched on', () => {
    const { facts, toggles } = resolved(
      new Map([[toggleAt('option:humanoid-form-sense'), { on: true, suboption: Slug.parse('darkvision') }]]),
    );

    expect(toggles.map(({ option }) => option)).not.toContain('option:humanoid-form-sense');
    expect(facts.has('option:humanoid-form-sense:darkvision')).toBe(false);
  });
});
