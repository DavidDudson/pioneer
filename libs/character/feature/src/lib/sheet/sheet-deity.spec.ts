import { TestBed } from '@angular/core/testing';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder, playerCoreClassId } from '@pioneer/character/domain/testing';
import type { PlayerCoreClass } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { DeityPickerRow } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { sheetDeityRows } from './sheet-deity';

const NEEDS_FONT = 'A cleric needs a deity with a divine font';

const READS = {
  translate: (key: string): string => (key === 'character.sheet.deity.needsFont' ? NEEDS_FONT : 'No deity'),
  unlistedWeapon: (weapon: string): string => weapon,
};

function characterOf(className: PlayerCoreClass): Character {
  return new CharacterBuilder().atLevel(1).picking('class', playerCoreClassId(className)).build();
}

async function registry(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting() });
  return TestBed.inject(ContentLoader).registry(CHARACTER_CONTENT_KINDS);
}

/** The rows that are deities: all but the one that picks none. */
const deitiesOf = (rows: readonly DeityPickerRow[]): readonly DeityPickerRow[] => rows.slice(1);

describe(sheetDeityRows, () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('lists No deity first, then every deity by name with the facts to choose by', async () => {
    const [none, ...deities] = sheetDeityRows(await registry(), characterOf('fighter'), READS);

    expect(none).toMatchObject({ id: '', name: 'No deity', disabledReason: undefined });
    expect(deities.length).toBeGreaterThan(0);
    expect(deities.map((deity) => deity.name)).toStrictEqual(
      deities.map((deity) => deity.name).toSorted((left, right) => left.localeCompare(right)),
    );
    expect(deities.every((deity) => deity.sources.length > 0)).toBe(true);
  });

  it('leaves every deity open to a character that is not a cleric', async () => {
    const rows = sheetDeityRows(await registry(), characterOf('fighter'), READS);

    expect(deitiesOf(rows).filter((deity) => deity.disabledReason !== undefined)).toStrictEqual([]);
  });

  it('disables a deity without a divine font for a cleric, saying why, and no other', async () => {
    const rows = deitiesOf(sheetDeityRows(await registry(), characterOf('cleric'), READS));

    const fontless = rows.filter((deity) => deity.fonts.length === 0);
    expect(fontless.length).toBeGreaterThan(0);
    expect(fontless.map((deity) => deity.disabledReason)).toStrictEqual(fontless.map(() => NEEDS_FONT));
    const fonted = rows.filter((deity) => deity.fonts.length > 0);
    expect(fonted.map((deity) => deity.disabledReason)).toStrictEqual(fonted.map(() => undefined));
  });
});
