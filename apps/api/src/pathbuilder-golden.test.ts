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

/** Every total and rank the engine derives for Mordred: AC, Hit Points, Speed, the ranks (saves, skills, armor, weapons, casting), DCs and the spell slots of the caster it pairs with. */
const COMPARED = 62;

/** Briar Rose's too, and the DC of her Dream Magic, which her Free Archetype feat now places. */
const COMPARED_BRIAR = 63;

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
      expect(report.discrepancies.compared).toBe(COMPARED_BRIAR);
      /**
       * AC: Pathbuilder counts the +2 of armor runes on clothing it exports as not worn (acItemBonus 2); Pioneer wears only what the export marks worn, so it has no item bonus.
       * Dream Magic DC: accepted, not a bug. Pioneer has one spellcasting rank for every tradition (ADR-0040, as Foundry's pf2e keeps it), so the DC reads that one rank (30); Pathbuilder computes it differently (28).
       */
      expect(summary(report.discrepancies.differences)).toStrictEqual([
        'ac: Pathbuilder 30, Pioneer 28',
        'hp:max: Pathbuilder 151, Pioneer 140',
        'focus-points: Pathbuilder 3, Pioneer 1',
        'perception: Pathbuilder 21, Pioneer 20',
        'save:fortitude: Pathbuilder 20, Pioneer 19',
        'save:reflex: Pathbuilder 19, Pioneer 18',
        'save:will: Pathbuilder 23, Pioneer 22',
        'skill:acrobatics: Pathbuilder 16, Pioneer 3',
        'skill:arcana: Pathbuilder 18, Pioneer 16',
        'skill:crafting: Pathbuilder 16, Pioneer 3',
        'skill:diplomacy: Pathbuilder 15, Pioneer 13',
        'skill:intimidation: Pathbuilder 13, Pioneer 0',
        'skill:medicine: Pathbuilder 18, Pioneer 5',
        'skill:nature: Pathbuilder 24, Pioneer 18',
        'skill:performance: Pathbuilder 13, Pioneer 0',
        'skill:religion: Pathbuilder 23, Pioneer 18',
        'skill:society: Pathbuilder 16, Pioneer 3',
        'skill:thievery: Pathbuilder 16, Pioneer 3',
        'spell-dc:dream-magic: Pathbuilder 28, Pioneer 30',
        'skill:acrobatics: Pathbuilder trained, Pioneer untrained',
        'skill:arcana: Pathbuilder expert, Pioneer trained',
        'skill:crafting: Pathbuilder trained, Pioneer untrained',
        'skill:diplomacy: Pathbuilder expert, Pioneer trained',
        'skill:intimidation: Pathbuilder trained, Pioneer untrained',
        'skill:medicine: Pathbuilder trained, Pioneer untrained',
        'skill:nature: Pathbuilder master, Pioneer trained',
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
        'perception: Pathbuilder 20, Pioneer 19',
        'save:reflex: Pathbuilder 17, Pioneer 16',
        'skill:acrobatics: Pathbuilder 0, Pioneer -1',
        'skill:athletics: Pathbuilder 23, Pioneer 22',
        'skill:deception: Pathbuilder 20, Pioneer 5',
        'skill:diplomacy: Pathbuilder 27, Pioneer 21',
        'skill:intimidation: Pathbuilder 22, Pioneer 19',
        'skill:medicine: Pathbuilder 17, Pioneer 3',
        'skill:nature: Pathbuilder 17, Pioneer 3',
        'skill:occultism: Pathbuilder 17, Pioneer 15',
        'skill:performance: Pathbuilder 20, Pioneer 5',
        'skill:stealth: Pathbuilder 0, Pioneer -1',
        'skill:survival: Pathbuilder 17, Pioneer 3',
        'skill:thievery: Pathbuilder 0, Pioneer -1',
        'class-dc: Pathbuilder 28, Pioneer 30',
        'spell-dc:champion-focus: Pathbuilder 32, Pioneer 31',
        'class-dc: Pathbuilder trained, Pioneer expert',
        'skill:deception: Pathbuilder trained, Pioneer untrained',
        'skill:diplomacy: Pathbuilder master, Pioneer expert',
        'skill:intimidation: Pathbuilder expert, Pioneer trained',
        'skill:medicine: Pathbuilder trained, Pioneer untrained',
        'skill:nature: Pathbuilder trained, Pioneer untrained',
        'skill:occultism: Pathbuilder expert, Pioneer trained',
        'skill:performance: Pathbuilder trained, Pioneer untrained',
        'skill:survival: Pathbuilder trained, Pioneer untrained',
      ]);
    },
    LOAD_TIMEOUT_MS,
  );
});

/** Plant Empathy, which Voice of Nature offers, and Break Curse, a skill feat taken in a general slot. */
const BRIAR_PLACED = ['8f39d3b1-bedb-5ed6-8fc1-f43753c4f8ad', '36f19b8e-8242-5707-9cbb-5785601e83e5'];

/** Fey Influence and Fey Ascension, Universal Ancestry feats taken in a human's ancestry slots, and Shield Warden, which Knight Vigilant lists as an additional feat. */
const MORDRED_PLACED = [
  '2a081489-546b-5c7d-8df0-9d1c77ec1fb0',
  '7cf63233-3636-5cdc-bd75-e068057a2ee2',
  'be7de1bc-ac66-55d9-b822-68ccc2b6529f',
];

describe('Pathbuilder feats over the official packs', () => {
  test(
    'Briar Rose places the Voice of Nature feat and the skill feat in her general slot',
    async () => {
      const { character } = await service.importPathbuilder(actor, briarRoseExport);
      const picked = new Set<unknown>(Object.values(character.document.build.choices));
      expect(BRIAR_PLACED.filter((id) => !picked.has(id))).toStrictEqual([]);
    },
    LOAD_TIMEOUT_MS,
  );

  test(
    'Mordred places the Universal Ancestry feats and the feat his archetype lists as its own',
    async () => {
      const { character } = await service.importPathbuilder(actor, mordredExport);
      const picked = new Set<unknown>(Object.values(character.document.build.choices));
      expect(MORDRED_PLACED.filter((id) => !picked.has(id))).toStrictEqual([]);
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
 * as gaps; an innate caster's feat grants its spells, so only a feat the import does not place leaves them as gaps. Focus spells are compared, not placed.
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
        'divine wis focus no-entry: 3',
        'occult wis focus no-entry: 3',
      ]);
    },
    LOAD_TIMEOUT_MS,
  );

  test(
    "Mordred's Oracle fills its repertoire; the archetype caster has no entry",
    async () => {
      const { character, report } = await service.importPathbuilder(actor, mordredExport);
      expect(spellPickCount(character.document.build.choices)).toBe(18);
      expect(gapSummary(report.spellGaps)).toStrictEqual([
        'Oracle no-slot: 4',
        'Oracle not-offered: 6',
        'Archetype Sorcerer no-entry: 4',
        'divine cha focus not-granted: 1',
      ]);
    },
    LOAD_TIMEOUT_MS,
  );
});
