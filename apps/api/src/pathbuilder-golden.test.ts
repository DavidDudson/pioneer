import { describe, expect, test } from 'bun:test';

import {
  InMemoryCharacterRepository,
  InMemoryCharacterVariantRepository,
  PathbuilderImportService,
} from '@pioneer/character/application';
import type { Discrepancy } from '@pioneer/interop/pathbuilder';
import { briarRoseExport, mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

/** Time to load every official pack. */
const LOAD_TIMEOUT_MS = 60_000;

/** Every total and rank the engine derives for either character: AC, Hit Points, Speed, the ranks (saves, skills, armor, weapons, casting) and DCs. */
const COMPARED = 33;

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));

const actor = UserId.parse(newId());
const service = new PathbuilderImportService(
  {
    characters: new InMemoryCharacterRepository(),
    content: { registry: async (): Promise<ContentRegistry> => registry },
    variants: new InMemoryCharacterVariantRepository(),
  },
  fixedClock('2026-10-16T10:00:00Z'),
);

/**
 * Pathbuilder's own exports imported over the official packs: what the engine derives that Pathbuilder computed
 * differently (#312). Pins the differences as they stand, so a change to the rules or the import shows up here.
 */
const summary = (differences: readonly Discrepancy[]): string[] =>
  differences.map(
    ({ selector, pathbuilder, pioneer }) => `${selector}: Pathbuilder ${pathbuilder}, Pioneer ${pioneer}`,
  );

/**
 * Pathbuilder's own exports imported over the official packs: what the engine derives that Pathbuilder computed
 * differently (#312). Pins the differences as they stand, so a change to the rules or the import shows up here.
 */
describe('Pathbuilder exports over the official packs', () => {
  test(
    'Briar Rose differs in AC, Hit Points and the skill ranks her build does not reach',
    async () => {
      const { report } = await service.importPathbuilder(actor, briarRoseExport);
      expect(report.discrepancies.compared).toBe(COMPARED);
      expect(summary(report.discrepancies.differences)).toStrictEqual([
        'ac: Pathbuilder 30, Pioneer 28',
        'hp:max: Pathbuilder 151, Pioneer 140',
        'skill:acrobatics: Pathbuilder trained, Pioneer untrained',
        'skill:arcana: Pathbuilder expert, Pioneer trained',
        'skill:crafting: Pathbuilder trained, Pioneer untrained',
        'skill:diplomacy: Pathbuilder expert, Pioneer trained',
        'skill:intimidation: Pathbuilder trained, Pioneer untrained',
        'skill:medicine: Pathbuilder trained, Pioneer untrained',
        'skill:nature: Pathbuilder master, Pioneer expert',
        'skill:occultism: Pathbuilder expert, Pioneer trained',
        'skill:performance: Pathbuilder trained, Pioneer untrained',
        'skill:religion: Pathbuilder master, Pioneer trained',
        'skill:society: Pathbuilder trained, Pioneer untrained',
        'skill:thievery: Pathbuilder trained, Pioneer untrained',
      ]);
    },
    LOAD_TIMEOUT_MS,
  );

  test(
    'Mordred differs in AC, the Oracle spell DC, the class DC and the skill ranks his build does not reach',
    async () => {
      const { report } = await service.importPathbuilder(actor, mordredExport);
      expect(report.discrepancies.compared).toBe(COMPARED);
      expect(summary(report.discrepancies.differences)).toStrictEqual([
        'ac: Pathbuilder 34, Pioneer 33',
        'spell-dc:oracle: Pathbuilder 32, Pioneer 31',
        'class-dc: Pathbuilder trained, Pioneer expert',
        'skill:diplomacy: Pathbuilder master, Pioneer expert',
        'skill:intimidation: Pathbuilder expert, Pioneer trained',
        'skill:medicine: Pathbuilder trained, Pioneer untrained',
        'skill:nature: Pathbuilder trained, Pioneer untrained',
        'skill:occultism: Pathbuilder expert, Pioneer trained',
        'skill:performance: Pathbuilder trained, Pioneer untrained',
        'skill:religion: Pathbuilder expert, Pioneer trained',
        'skill:survival: Pathbuilder trained, Pioneer untrained',
      ]);
    },
    LOAD_TIMEOUT_MS,
  );
});
