import { describe, expect, test } from 'bun:test';

import {
  InMemoryCharacterRepository,
  InMemoryCharacterVariantRepository,
  PathbuilderImportService,
} from '@pioneer/character/application';
import { LanguageName } from '@pioneer/character/domain';
import { ImportKind, UnmatchedReason } from '@pioneer/interop/pathbuilder';
import { briarRoseExport } from '@pioneer/interop/pathbuilder/testing';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

/** Time to load every official pack. */
const LOAD_TIMEOUT_MS = 60_000;

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));

const service = new PathbuilderImportService(
  {
    characters: new InMemoryCharacterRepository(),
    content: { registry: async (): Promise<ContentRegistry> => registry },
    variants: new InMemoryCharacterVariantRepository(),
  },
  fixedClock('2026-10-16T10:00:00Z'),
);

/** A language no official pack defines, which Briar Rose's export names (#1595). */
const WILDSONG = 'Wildsong';

describe('Pathbuilder languages over the official packs', () => {
  test(
    'Briar Rose keeps Wildsong as a custom language, and the report lists it as custom, not lost',
    async () => {
      const { character, report } = await service.importPathbuilder(UserId.parse(newId()), briarRoseExport);
      expect(character.document.build.customLanguages).toContain(LanguageName.parse(WILDSONG));
      const languages = report.unmatched.find(({ kind }) => kind === ImportKind.Language);
      const wildsong = languages?.names.find(({ name }) => name === WILDSONG);
      expect(wildsong?.reason).toBe(UnmatchedReason.Custom);
    },
    LOAD_TIMEOUT_MS,
  );
});
