import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../testing/sheet-page-harness';
import { TEST_PACKS } from '../testing/test-packs';

const openSheet = openerAt(SheetMode.Exploration);

/** Merisiel carrying the `customLanguages` an import kept by name. */
function carrying(customLanguages: readonly string[]): object {
  return { ...MERISIEL, build: { ...MERISIEL.build, customLanguages } };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function languagesSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-languages"]'));
}

describe('CharacterSheetPage custom languages', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], TEST_PACKS);
  }, PREBUILD_TIMEOUT);

  it('lists an imported custom language by name, marked Imported', async () => {
    const { root } = await openSheet(carrying(['Wildsong']), { packs: TEST_PACKS });

    await vi.waitFor(() => {
      const section = textOf(languagesSection(root));

      expect(section).toContain('Custom languages');
      expect(section).toContain('Wildsong');
      expect(section).toContain('Imported');
    });
  });

  it('lists nothing when the character has no custom language', async () => {
    const { root } = await openSheet(carrying([]), { packs: TEST_PACKS });

    await vi.waitFor(() => {
      expect(languagesSection(root)).not.toBeNull();
    });
    expect(textOf(languagesSection(root))).not.toContain('Custom languages');
  });

  it('removes one with a removeCustomLanguage patch', async () => {
    const { root } = await openSheet(carrying(['Wildsong']), { packs: TEST_PACKS });
    const remove = await vi.waitFor(() =>
      present(
        languagesSection(root).querySelector<HTMLElement>('fr-async-button button[aria-label="Remove Wildsong"]'),
      ),
    );

    remove.click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({ patch: { field: 'removeCustomLanguage', language: 'Wildsong' } });
  });
});
