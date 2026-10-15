import { expect } from 'bun:test';

import {
  characterSlots,
  characterStatisticInputs,
  characterStatistics,
  slotContent,
  SlotStatus,
} from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import { contentCatalog } from '@pioneer/rules/catalog';
import type { StatisticResult } from '@pioneer/rules/engine';
import { ContentRegistry } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';
import { benchmark } from '@pioneer/shared/bench';

import { level20Builds } from './level-20-build';

/**
 * Slots no build can fill yet, by class: Monk's Third Path to Perfection and Animist's Animistic Practice offer
 * nothing, and Exemplar's Energized Spark reads invalid whichever element it takes (the grants oscillate). Every
 * other slot of every class is filled.
 */
const UNFILLABLE: Readonly<Record<string, number>> = { Monk: 1, Animist: 1, Exemplar: 1 };

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const slots = slotContent(registry);
const builds = level20Builds(registry);

/** The whole derivation a sheet makes: the statistic inputs from the build and its gear, then every statistic. */
function derive(document: CharacterDocument): ReadonlyMap<Selector, StatisticResult> {
  const inputs = characterStatisticInputs(registry, document, slots);
  return characterStatistics(document, { registry, slots, inputs, variants: [] });
}

function failed(statistics: ReadonlyMap<Selector, StatisticResult>): readonly Selector[] {
  return [...statistics].flatMap(([selector, result]) => (result.ok ? [] : [selector]));
}

expect(builds.length).toBeGreaterThan(0);
for (const { name, document } of builds) {
  const read = characterSlots(document, slots);
  expect(read.filter(({ status }) => status === SlotStatus.Invalid)).toEqual([]);
  expect(read.filter(({ status }) => status === SlotStatus.Open)).toHaveLength(UNFILLABLE[name] ?? 0);
  expect(document.inventory.items.length).toBeGreaterThan(0);
  const statistics = derive(document);
  expect(statistics.size).toBeGreaterThan(0);
  expect(failed(statistics)).toEqual([]);
  // Tracked, not budgeted: a full build takes 9 to 13 ms, about the 10 ms goal in rules-engine.md.
  benchmark({
    name: `character: level 20 ${name} with every slot and its gear filled`,
    prepare: () => document,
    run: derive,
  });
}
