import { slotContent } from '@pioneer/character/domain';
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
