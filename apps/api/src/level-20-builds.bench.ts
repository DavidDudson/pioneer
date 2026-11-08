import { buildRanks, characterSlots, slotContent } from '@pioneer/character/domain';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { benchmark } from '@pioneer/shared/bench';

import { level20Builds } from './level-20-build';
import { deriveSheet } from './level-20-derive';

/* What a build must hold (every slot filled, every statistic derived) is checked by `level-20-builds.test.ts`. */

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const slots = slotContent(registry, [], true);

for (const { name, document } of level20Builds(registry)) {
  // Tracked, not budgeted: a full build takes 9 to 13 ms, about the 10 ms goal in rules-engine.md.
  benchmark({
    name: `character: level 20 ${name} with every slot and its gear filled`,
    prepare: () => document,
    run: (built) => deriveSheet(registry, slots, built),
  });
}

const ROGUE = 'Rogue';
/* Budgets are for the reference machine (calibration 5 ms) and scale by each runner's calibration. Measured on 2026-11-08: 15.5 and 38 ms on the reference machine; on shared runners 21 and 54 ms at calibration 6.2 to 6.8 ms, and 35 and 87 ms at 10.6 to 11.9 ms. The time per calibration millisecond ran 3.2 to 3.5 (ranks) and 7.9 to 8.9 (slots) on every runner, so the budgets sit 25% above the worst of those: a return to a grant resolution per level does not fit. */
const RANKS_BUDGET_MS = 22;
const SLOTS_BUDGET_MS = 56;
const rogue = level20Builds(registry).find((build) => build.name === ROGUE);
if (rogue === undefined) {
  throw new Error(`The catalog has no ${ROGUE} to bench`);
}

// A rogue trains seven skills and increases one at every level from 2nd, so its grants differ at nearly every level.
// Each run is given a new document and build, as the grants and boosts read from them are kept.
benchmark({
  name: 'character: level 20 Rogue skill ranks',
  budgetMs: RANKS_BUDGET_MS,
  prepare: () => ({ ...rogue.document, build: { ...rogue.document.build } }),
  run: (document) => buildRanks(document, slots),
});

benchmark({
  name: 'character: level 20 Rogue slots',
  budgetMs: SLOTS_BUDGET_MS,
  prepare: () => ({ ...rogue.document, build: { ...rogue.document.build } }),
  run: (document) => characterSlots(document, slots),
});
