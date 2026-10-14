import { TestBed } from '@angular/core/testing';
import { ANCESTRY_SLOT, CharacterPatchField } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import type { HeritagePickerRow } from '@pioneer/rules/ui';
import { Temporal } from '@pioneer/shared/kernel';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { CHARACTER_CONTENT_KINDS } from './content-registry-query';
import { ancestryRows, backgroundRows, heritageRows } from './origin-rows';

const READS = {
  translate: (key: string, params?: object): string => `${key} ${JSON.stringify(params ?? {})}`,
};

async function registry(kinds: readonly ContentKind[] = CHARACTER_CONTENT_KINDS): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting() });
  return TestBed.inject(ContentLoader).registry(kinds);
}

/** A level 1 character with the ancestry named `name` picked. */
function characterOf(content: ContentRegistry, name: string): Character {
  const ancestry = content.ancestries().find((entry) => entry.definition.name === name);
  if (ancestry === undefined) {
    throw new Error(`Expected the content to hold the ${name} ancestry`);
  }
  return new CharacterBuilder().atLevel(1).withAncestry(ancestry.id).build();
}

/** The same character with the ancestry slot emptied, as before one is picked. */
function withoutAncestry(character: Character): Character {
  return character.apply({ field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT }, Temporal.Now.instant());
}

/** The heritages split by whose they are, for the Elf character. */
function heritagesOf(
  rows: readonly HeritagePickerRow[],
): Record<'elven' | 'others' | 'versatile', HeritagePickerRow[]> {
  return {
    elven: rows.filter((row) => row.ancestry === 'Elf'),
    others: rows.filter((row) => row.ancestry !== undefined && row.ancestry !== 'Elf'),
    versatile: rows.filter((row) => row.ancestry === undefined),
  };
}

describe('origin rows', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  describe(ancestryRows, () => {
    it('lists every ancestry by name with the facts to choose by, none of them disabled', async () => {
      const rows = ancestryRows(await registry(), undefined);

      expect(rows.map((row) => row.name)).toStrictEqual(
        rows.map((row) => row.name).toSorted((left, right) => left.localeCompare(right)),
      );
      expect(rows.filter((row) => row.disabledReason !== undefined)).toStrictEqual([]);
      expect(rows.every((row) => row.sources.length > 0)).toBe(true);
    });

    it('names an ancestry’s languages and traits instead of showing their ids', async () => {
      const elf = ancestryRows(await registry(), undefined).find((row) => row.name === 'Elf');

      expect(elf).toMatchObject({ hitPoints: 6, size: 'medium', speed: 30, flaws: ['con'] });
      expect(elf?.languages).toStrictEqual(expect.arrayContaining(['Common', 'Elven']));
      expect(elf?.traits).toStrictEqual(expect.arrayContaining(['Elf', 'Humanoid']));
    });
  });

  describe(heritageRows, () => {
    it("opens the heritages of the character's ancestry and the versatile ones", async () => {
      const content = await registry();
      const { elven, versatile } = heritagesOf(heritageRows(content, characterOf(content, 'Elf'), READS));

      expect(elven.length).toBeGreaterThan(0);
      expect(versatile.length).toBeGreaterThan(0);
      expect([...elven, ...versatile].map((row) => row.disabledReason)).toStrictEqual(
        [...elven, ...versatile].map(() => undefined),
      );
    });

    it('disables the heritages of other ancestries, saying whose they are', async () => {
      const content = await registry();
      const { others } = heritagesOf(heritageRows(content, characterOf(content, 'Elf'), READS));

      expect(others.length).toBeGreaterThan(0);
      expect(others.map((row) => row.disabledReason)).toStrictEqual(
        others.map((row) => `character.sheet.heritageOtherAncestry ${JSON.stringify({ ancestry: row.ancestry })}`),
      );
    });

    it('asks for an ancestry before any heritage of one can be picked', async () => {
      const content = await registry();
      const rows = heritageRows(content, withoutAncestry(characterOf(content, 'Elf')), READS);

      const ofAncestries = rows.filter((row) => row.ancestry !== undefined);
      expect(ofAncestries.length).toBeGreaterThan(0);
      expect(ofAncestries.map((row) => row.disabledReason)).toStrictEqual(
        ofAncestries.map(() => 'character.sheet.heritageNeedsAncestry {}'),
      );
    });
  });

  describe(backgroundRows, () => {
    it('lists every background with its boosts and the skill and Lore it trains', async () => {
      const content = await registry();
      const rows = backgroundRows(content, characterOf(content, 'Elf'), READS);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.sources.length > 0)).toBe(true);
      expect(rows.some((row) => row.boosts.length > 0)).toBe(true);
      expect(rows.some((row) => row.skills.length > 0)).toBe(true);
      expect(rows.some((row) => row.lores.length > 0)).toBe(true);
    });

    it('notes nothing for a character that is trained in none of the skills', async () => {
      const content = await registry();
      const rows = backgroundRows(content, characterOf(content, 'Elf'), READS);

      expect(rows.filter((row) => row.note !== undefined)).toStrictEqual([]);
    });
  });
});
