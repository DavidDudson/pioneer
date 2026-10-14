import { TestBed } from '@angular/core/testing';
import { languageContent } from '@pioneer/character/domain';
import { ContentLoader } from '@pioneer/rules/data-access';
import { Rarity } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { CHARACTER_CONTENT_KINDS } from './content-registry-query';
import { languageRows } from './language-rows';

const OFFERED = 2;

async function registry(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting() });
  return TestBed.inject(ContentLoader).registry(CHARACTER_CONTENT_KINDS);
}

describe(languageRows, () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('gives each offered language its rarity and source, and says which the character knows', async () => {
    const loaded = await registry();
    const offered = languageContent(loaded).languages.slice(0, OFFERED);
    const known = offered.slice(0, 1).map((each) => String(each.id));

    const rows = languageRows(
      loaded,
      offered.map(({ id, name }) => ({ id, name })),
      { known: new Set(known) },
    );

    expect(rows.map((row) => row.name)).toStrictEqual(offered.map((each) => each.name));
    expect(rows.map((row) => row.known)).toStrictEqual(offered.map((each) => known.includes(each.id)));
    expect(rows.map((row) => row.rarity)).toStrictEqual(offered.map((each) => each.rarity));
    expect(rows.every((row) => row.sources.length > 0)).toBe(true);
  });

  it('reads a language no loaded pack defines as common, with no source', async () => {
    const rows = languageRows(await registry(), [{ id: 'core-rules:language:unheard-of', name: 'Unheard-of' }], {
      known: new Set(),
    });

    expect(rows).toStrictEqual([
      {
        id: 'core-rules:language:unheard-of',
        name: 'Unheard-of',
        rarity: Rarity.Common,
        known: false,
        sources: [],
        disabledReason: undefined,
      },
    ]);
  });
});
