import { describe, expect, test } from 'bun:test';

import {
  InMemoryCharacterRepository,
  InMemoryCharacterVariantRepository,
  PathbuilderImportService,
} from '@pioneer/character/application';
import type { Discrepancy, SpellGap } from '@pioneer/interop/pathbuilder';
import { briarRoseExport, mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

/** Time to load every official pack. */
const LOAD_TIMEOUT_MS = 60_000;

/** Every total and rank the engine derives for either character: AC, Hit Points, Speed, the ranks (saves, skills, armor, weapons, casting), DCs and the spell slots of the caster it pairs with. */
const COMPARED = 40;

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
      /** AC: Pathbuilder counts the +2 of armor runes on clothing it exports as not worn (acItemBonus 2); Pioneer wears only what the export marks worn, so it has no item bonus. */
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
    'Mordred differs in AC, the champion focus spell DC, the class DC and the skill ranks his build does not reach',
    async () => {
      const { report } = await service.importPathbuilder(actor, mordredExport);
      expect(report.discrepancies.compared).toBe(COMPARED);
      /** AC: Pioneer's engine is 34 before Encumbered's Clumsy 1 (-1 on Dex-based AC). He carries 16 Bulk against a limit of 9 (5 + Str 4), which Pathbuilder does not track. */
      expect(summary(report.discrepancies.differences)).toStrictEqual([
        'ac: Pathbuilder 34, Pioneer 33',
        'spell-dc:champion-focus: Pathbuilder 32, Pioneer 31',
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

/** Gaps by caster and reason: `Oracle no-slot: 1`. */
const gapSummary = (gaps: readonly SpellGap[]): string[] =>
  Object.entries(Object.groupBy(gaps, ({ caster, reason }) => `${caster} ${reason}`)).map(
    ([key, group]) => `${key}: ${group?.length ?? 0}`,
  );

/** The slots a character's picks fill with spells: prepared and repertoire slots only. */
const spellPickCount = (choices: Readonly<Record<string, unknown>>): number =>
  Object.keys(choices).filter((key) => key.startsWith('prepared:') || key.startsWith('repertoire:')).length;

/**
 * Pathbuilder's spells over the official packs (#311): the casters the character has an entry for fill its slots,
 * and what no slot took is a gap. A caster the build lacks (an archetype, a class not carried over) leaves its spells
 * as gaps; an innate caster's feat grants its spells, so only a feat the import does not place leaves them as gaps. Focus spells and `perDay` are not placed.
 */
describe('Pathbuilder spells over the official packs', () => {
  test(
    "Briar Rose's Druid fills its prepared slots; the Animist and the innate casters whose feats are not placed have no entry",
    async () => {
      const { character, report } = await service.importPathbuilder(actor, briarRoseExport);
      expect(spellPickCount(character.document.build.choices)).toBe(21);
      expect(gapSummary(report.spellGaps)).toStrictEqual([
        'Animist Prepared no-entry: 12',
        'Animist Apparition no-entry: 21',
        'Vigilant Goloma no-entry: 1',
        'Dream Magic no-entry: 1',
      ]);
    },
    LOAD_TIMEOUT_MS,
  );

  test(
    "Mordred's Oracle fills its repertoire; the archetype and innate casters have no entry",
    async () => {
      const { character, report } = await service.importPathbuilder(actor, mordredExport);
      expect(spellPickCount(character.document.build.choices)).toBe(19);
      expect(gapSummary(report.spellGaps)).toStrictEqual([
        'Oracle no-slot: 1',
        'Oracle not-offered: 8',
        'Archetype Sorcerer no-entry: 4',
        'Fey Influence no-entry: 1',
        'Fey Ascension no-entry: 1',
        'Mortal Herald no-entry: 1',
      ]);
    },
    LOAD_TIMEOUT_MS,
  );
});
