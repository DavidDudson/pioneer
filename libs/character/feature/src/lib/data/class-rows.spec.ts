import { TestBed } from '@angular/core/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { AttributeModifier, AttributeModifiers, SlotKey } from '@pioneer/rules/sdk';
import type { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import type { SheetKeyAttribute } from '../sheet/sheet-build';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { classRows, keyAttributeRows } from './class-rows';
import { CHARACTER_CONTENT_KINDS } from './content-registry-query';

const READS = {
  translate: (key: string, params?: object): string => `${key} ${JSON.stringify(params ?? {})}`,
};

async function registry(kinds: readonly ContentKind[] = CHARACTER_CONTENT_KINDS): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting() });
  return TestBed.inject(ContentLoader).registry(kinds);
}

describe('class rows', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  describe(classRows, () => {
    it('lists every class by name with the facts to choose by, none of them disabled', async () => {
      const rows = classRows(await registry(), undefined, READS);

      expect(rows.map((row) => row.name)).toStrictEqual(
        rows.map((row) => row.name).toSorted((left, right) => left.localeCompare(right)),
      );
      expect(rows.filter((row) => row.disabledReason !== undefined)).toStrictEqual([]);
      expect(rows.every((row) => row.sources.length > 0)).toBe(true);
    });

    it('gives a fighter its key attributes and no tradition', async () => {
      const fighter = classRows(await registry(), undefined, READS).find((row) => row.name === 'Fighter');

      expect(fighter?.keyAttribute).toStrictEqual(['dex', 'str']);
      expect(fighter?.traditions).toStrictEqual([]);
    });

    it('names the tradition of a wizard’s spellcasting', async () => {
      const wizard = classRows(await registry(), undefined, READS).find((row) => row.name === 'Wizard');

      expect(wizard?.traditions).toStrictEqual(['rules.facet.tradition.arcane {}']);
    });

    it('words each starting rank with its statistic and rank', async () => {
      const wizard = classRows(await registry(), undefined, READS).find((row) => row.name === 'Wizard');

      expect(wizard?.proficiencies.length).toBeGreaterThan(0);
      expect(wizard?.proficiencies.every((each) => each.startsWith('rules.classPicker.proficiency'))).toBe(true);
    });
  });

  describe(keyAttributeRows, () => {
    const allowed: SheetKeyAttribute = { key: SlotKey.parse('boost:1:class:0'), options: ['str', 'dex'] };

    it('gives each allowed attribute the character’s modifier and the score it stands for', () => {
      const modifiers = AttributeModifiers.none
        .with('str', AttributeModifier.parse(3))
        .with('dex', AttributeModifier.parse(-1));

      const rows = keyAttributeRows(allowed, modifiers, READS);

      expect(rows.map((row) => [row.id, row.modifier, row.score])).toStrictEqual([
        ['str', 3, 16],
        ['dex', -1, 8],
      ]);
    });
  });
});
