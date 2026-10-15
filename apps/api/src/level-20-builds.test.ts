import { describe, expect, test } from 'bun:test';

import { characterSlots, slotContent, SlotStatus } from '@pioneer/character/domain';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';

import { level20Builds } from './level-20-build';
import { deriveSheet, failedSelectors, unfillableSlots } from './level-20-derive';

/** Time to load every pack and fill a build for every class. */
const BUILD_TIMEOUT_MS = 60_000;

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const slots = slotContent(registry);
const builds = level20Builds(registry);

describe('level 20 builds', () => {
  test('there is a build for every class', () => {
    expect(builds.length).toBeGreaterThan(0);
  });

  describe.each([...builds])('$name', ({ name, document }) => {
    test(
      'has no invalid slot, and no open one but those no build can fill yet',
      () => {
        const read = characterSlots(document, slots);
        expect(read.filter(({ status }) => status === SlotStatus.Invalid)).toEqual([]);
        expect(read.filter(({ status }) => status === SlotStatus.Open)).toHaveLength(unfillableSlots(name));
      },
      BUILD_TIMEOUT_MS,
    );

    test(
      'derives every statistic with its gear on',
      () => {
        expect(document.inventory.items.length).toBeGreaterThan(0);
        const statistics = deriveSheet(registry, slots, document);
        expect(statistics.size).toBeGreaterThan(0);
        expect(failedSelectors(statistics)).toEqual([]);
      },
      BUILD_TIMEOUT_MS,
    );
  });
});
