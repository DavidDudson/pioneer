import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { TEST_PACKS } from '../../testing/test-packs';

const PICKS_PACK = 'unplaced-picks';

const picks = new ContentPackBuilder().withId(PICKS_PACK).withLanguage('elven').build();

const PICKS: PackContentsLoader = {
  id: PackId.parse(PICKS_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles(
      { id: PICKS_PACK, title: 'Unplaced picks', publisher: 'Pioneer tests', license: 'homebrew' },
      [picks.otherEntries],
    ),
};
const openSheet = openerAt(SheetMode.Exploration);
const PACKS = [...TEST_PACKS, PICKS];

const ELVEN = present(picks.otherEntries.find((entry) => entry.name === 'Elven')).id;

/** Merisiel carrying `unplacedLanguages` the import found no slot for. */
function carrying(unplacedLanguages: readonly string[]): object {
  return { ...MERISIEL, build: { ...MERISIEL.build, unplacedLanguages } };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function languagesSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-languages"]'));
}

describe('CharacterSheetPage languages with no slot', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('flags an imported language no slot holds, by name, with the rule it breaks', async () => {
    const { root } = await openSheet(carrying([ELVEN]), { packs: PACKS });

    await vi.waitFor(() => {
      const section = textOf(languagesSection(root));

      expect(section).toContain('Languages with no slot');
      expect(section).toContain('Elven');
      expect(section).toContain('No language slot has room for this language');
    });
  });

  it('counts it in the sheet header with the other rule breaks', async () => {
    const { root } = await openSheet(carrying([ELVEN]), { packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(root)).toContain('1 item breaks a rule');
    });
  });

  it('lists nothing when every imported language has a slot', async () => {
    const { root } = await openSheet(carrying([]), { packs: PACKS });

    await vi.waitFor(() => {
      expect(languagesSection(root)).not.toBeNull();
    });
    expect(textOf(languagesSection(root))).not.toContain('Languages with no slot');
  });

  it('dismisses a flagged language with a dismissUnplacedLanguage patch', async () => {
    const { root } = await openSheet(carrying([ELVEN]), { packs: PACKS });
    const dismiss = await vi.waitFor(() =>
      present(languagesSection(root).querySelector<HTMLElement>('fr-async-button button[aria-label^="Dismiss"]')),
    );

    dismiss.click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({ patch: { field: 'dismissUnplacedLanguage', language: ELVEN } });
  });
});
