/// <reference types="bun" />
// oxlint-disable-next-line import/no-unassigned-import -- the rules/ui barrel declares components, which need Angular's JIT compiler under bun
import '@angular/compiler';
import { TargetValue } from '@pioneer/rules/sdk';
import type { SpellRowLine } from '@pioneer/rules/ui';
import { benchmark } from '@pioneer/shared/bench';

import { spellLine } from '../testing/spell-line-testing';
import { filterSpells, SpellFilterGroupId, spellFilterGroups } from './sheet-spell-filter';
import type { SourcedSpell, SpellPicks } from './sheet-spell-filter';

/** Spells on a spell list the Spells tab filters: a character with every tradition's spells in reach. */
const SPELLS = 1000;

const SOURCES = ['Wizard', 'Cleric', 'Wand of Fear', 'Staff of Fire'] as const;
const TRAITS = ['Fire', 'Mental', 'Fear', 'Manipulate', 'Incapacitation'] as const;
const DAMAGE = ['fire', 'mental', 'cold'] as const;
const TARGETS = [TargetValue.Single, TargetValue.Multiple] as const;

/** The issue's budget for filtering a thousand spells. */
const FILTER_BUDGET_MS = 1.5;

/** The issue's budget for counting the filter panel's options over a thousand spells. */
const GROUPS_BUDGET_MS = 3;

/** A thousand spells spread over the sources, traits, damage types and targets. */
function spells(): readonly SourcedSpell[] {
  return Array.from({ length: SPELLS }, (_value, index): SourcedSpell => {
    const name = `Spell ${index}`;

    const detail = spellLine({
      slug: `spell-${index}`,
      name,
      targets: [TARGETS[index % TARGETS.length] ?? TargetValue.Single],
      traits: [TRAITS[index % TRAITS.length] ?? 'Fire', TRAITS[(index + 1) % TRAITS.length] ?? 'Fire'],
      damage: [DAMAGE[index % DAMAGE.length] ?? 'fire'],
    });

    const line: SpellRowLine = { key: name, detail };

    return { line, source: SOURCES[index % SOURCES.length] };
  });
}

/** Two groups picked, as a player narrowing to fire spells from one source would. */
const PICKS: SpellPicks = new Map([
  [SpellFilterGroupId.Trait, new Set(['Fire'])],
  [SpellFilterGroupId.Source, new Set(['Wizard', 'Cleric'])],
]);

const label = (key: string): string => key;
const WORDS = { label, value: (_group: SpellFilterGroupId, value: string): string => value };

const kept = filterSpells(spells(), PICKS).length;
const groups = spellFilterGroups(spells(), PICKS, WORDS).length;

if (kept === 0 || kept === SPELLS || groups !== Object.values(SpellFilterGroupId).length) {
  throw new Error('the filter must keep some spells and drop others, and give a group each');
}

benchmark({
  name: 'character: filter a thousand spells',
  budgetMs: FILTER_BUDGET_MS,
  prepare: spells,
  run: (given) => filterSpells(given, PICKS),
});

benchmark({
  name: 'character: count the spell filter options over a thousand spells',
  budgetMs: GROUPS_BUDGET_MS,
  prepare: spells,
  run: (given) => spellFilterGroups(given, PICKS, WORDS),
});
