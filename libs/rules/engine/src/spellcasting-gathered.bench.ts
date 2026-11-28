import { expect } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import type { RuleJson } from '@pioneer/rules/sdk/testing';
import { benchmark } from '@pioneer/shared/bench';

import type { ModifierInputs } from './rule-in-play';
import { spellcastingInPlay } from './spellcasting-in-play';
import { inPlay } from './testing';

/** Elements of each spell-giving kind a level 20 caster has in play: feats, features, items and a bloodline. */
const ELEMENTS_PER_KIND = 30;

/** Spells in an element's list, shared with its neighbours so the dedupe has duplicates to drop. */
const SPELLS_PER_ELEMENT = 8;

/** Spells the elements draw on, so a list grows until the pool is used up. */
const SPELL_POOL_SIZE = 64;

/** Spell ranks an element names a spell at: a cantrip, then 1 to 9. */
const RANKS = 10;

/** Gathering a level 20 caster's spells takes about 0.1 ms; the budget leaves room for a noisy runner. */
const BUDGET_MS = 1;

const SPELL_POOL = Array.from({ length: SPELL_POOL_SIZE }, (_value, index) =>
  ContentId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`),
);

/** The spells of the `element`th element, starting at its own place in the pool so neighbours overlap. */
const spellsPerElement = Array.from({ length: ELEMENTS_PER_KIND }, (_value, element) =>
  [...SPELL_POOL, ...SPELL_POOL].slice(element, element + SPELLS_PER_ELEMENT),
);

/** The same spells with a rank each. */
const grantedPerElement = spellsPerElement.map((spells, element) =>
  spells.map((spell, offset) => ({
    rank: (element + offset) % RANKS === 0 ? 'cantrip' : (element + offset) % RANKS,
    spell,
  })),
);

/** One spontaneous entry and every spell-giving element a level 20 caster could have for it. */
function inputs(): ModifierInputs {
  const placed: Array<RuleJson> = [
    { key: 'SpellcastingEntry', slug: 'caster', tradition: 'arcane', attribute: 'int', preparation: 'spontaneous' },
    ...spellsPerElement.map((spells): RuleJson => ({ key: 'PoolSpells', entry: 'caster', pool: 'curriculum', spells })),
    ...spellsPerElement.map((spells): RuleJson => ({ key: 'FocusSpells', entry: 'caster', spells })),
    ...grantedPerElement.map((spells): RuleJson => ({ key: 'InnateSpells', entry: 'caster', spells })),
    ...grantedPerElement.map((spells): RuleJson => ({ key: 'RepertoireSpells', entry: 'caster', spells })),
  ];

  const rules = placed.map((element, rule) => inPlay(element, 'caster-spellcasting', { rule }));

  return { rules, facts: new PredicateFacts([], CORE_NAMESPACES) };
}

const [caster] = spellcastingInPlay(inputs());

expect(caster?.grantedSpells.length).toBeGreaterThan(0);

expect(caster?.grantedSpells.length).toBeLessThanOrEqual(SPELL_POOL_SIZE * RANKS);

benchmark({
  name: 'engine: gather the spells of a level 20 caster',
  budgetMs: BUDGET_MS,
  prepare: inputs,
  run: spellcastingInPlay,
});
