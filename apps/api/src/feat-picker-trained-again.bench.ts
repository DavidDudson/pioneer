import { expect } from 'bun:test';

import {
  availableToYou,
  featSlots,
  repeatedTrainings,
  slotContent,
  slotPrerequisiteStatus,
} from '@pioneer/character/domain';
import { contentCatalog } from '@pioneer/rules/catalog';
import {
  ChoiceValue,
  ContentId,
  ContentKind,
  ContentRegistry,
  facetsFor,
  filterEntries,
  prerequisitesMetFacet,
} from '@pioneer/rules/sdk';
import { benchmark } from '@pioneer/shared/bench';

import { level20Builds } from './level-20-build';

/* What a feat picker reads when it opens (#729): which of the feats shown would train a skill again. It opens on the
   Available to you preset, so only the feats that preset keeps are read: 74 of the widest slot's 1,733 feats take about
   80 ms, where all of them took about 1.9 s. */

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const content = slotContent(registry);

const ROGUE = 'Rogue';
/* About 80 ms on a dev machine; a budget a bench run on a shared runner stays under, and a read of the whole slot does not. */
const BUDGET_MS = 400;
const rogue = level20Builds(registry).find((build) => build.name === ROGUE);
if (rogue === undefined) {
  throw new Error(`The catalog has no ${ROGUE} to bench`);
}
const [widest] = featSlots(rogue.document, content).toSorted(
  (left, right) => right.options.length - left.options.length,
);
if (widest === undefined) {
  throw new Error(`The ${ROGUE} has no feat slot`);
}

// The picker's own cut: the entries the preset keeps, as `featSlotFilter` reads them.
const facets = [
  ...facetsFor([ContentKind.Feat]),
  prerequisitesMetFacet(slotPrerequisiteStatus(rogue.document, content, widest.key)),
];
const byId = new Map(registry.packs.flatMap((pack) => pack.otherEntries).map((entry) => [entry.id, entry]));
const entries = widest.options.flatMap((option) => byId.get(ContentId.parse(option.value)) ?? []);
const kept = filterEntries(entries, facets, availableToYou(rogue.document, content, widest.key));
const values = kept.map((entry) => ChoiceValue.parse(entry.id));

expect(values.length).toBeGreaterThan(0);
expect(values.length).toBeLessThan(widest.options.length);
benchmark({
  name: 'character: feat picker trained-again marks over the feats available to a level 20 Rogue',
  budgetMs: BUDGET_MS,
  prepare: () => ({ ...rogue.document, build: { ...rogue.document.build } }),
  run: (document) => repeatedTrainings(document, content, { slot: widest.key, values }),
});
