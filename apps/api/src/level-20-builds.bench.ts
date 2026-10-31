import { buildRanks, characterSlots, slotContent } from '@pioneer/character/domain';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { benchmark } from '@pioneer/shared/bench';

import { level20Builds } from './level-20-build';
import { deriveSheet } from './level-20-derive';

/* What a build must hold (every slot filled, every statistic derived) is checked by `level-20-builds.test.ts`. */

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const slots = slotContent(registry);

for (const { name, document } of level20Builds(registry)) {
  // Tracked, not budgeted: a full build takes 9 to 13 ms, about the 10 ms goal in rules-engine.md.
  benchmark({
    name: `character: level 20 ${name} with every slot and its gear filled`,
    prepare: () => document,
    run: (built) => deriveSheet(registry, slots, built),
  });
}

const ROGUE = 'Rogue';
/* About 7 and 20 ms on a dev machine, 12 and 33 ms on a shared runner; a budget a bench run on a shared runner stays under, and a return to a grant resolution per level does not. */
const RANKS_BUDGET_MS = 16;
const SLOTS_BUDGET_MS = 40;
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
