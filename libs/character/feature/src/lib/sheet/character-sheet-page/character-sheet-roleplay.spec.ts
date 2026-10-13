import { HttpTestingController } from '@angular/common/http/testing';
import type { TestRequest } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { describe, expect, it, vi } from 'vitest';

import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';

const openSheet = openerAt(SheetMode.Exploration);

const SCARRED = [{ type: 'paragraph', content: [{ type: 'text', text: 'A scar over the left eye.' }] }];

function roleplaySection(root: HTMLElement): HTMLElement {
  return present(root.querySelector('section[aria-labelledby="sheet-roleplay"]'));
}

function fieldNamed(root: HTMLElement, label: string): HTMLElement {
  return present(
    [...roleplaySection(root).querySelectorAll<HTMLElement>('fr-inline-field')].find((each) =>
      each.textContent.trim().startsWith(label),
    ),
  );
}

async function patchRequest(): Promise<TestRequest> {
  return vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
  );
}

describe('CharacterSheetPage appearance and personality', () => {
  it('lists both fields on Exploration, each reading as not written yet when empty', async () => {
    const { root } = await openSheet(MERISIEL);

    await vi.waitFor(() => {
      expect(fieldNamed(root, 'Appearance').textContent).toContain('Not written yet');
      expect(fieldNamed(root, 'Personality').textContent).toContain('Not written yet');
    });
  });

  it('shows what the server read', async () => {
    const { root } = await openSheet({ ...MERISIEL, appearance: SCARRED });

    await vi.waitFor(() => {
      expect(fieldNamed(root, 'Appearance').textContent).toContain('A scar over the left eye.');
    });
    expect(fieldNamed(root, 'Personality').textContent).toContain('Not written yet');
  });

  it('saves a written appearance as rich text paragraphs', async () => {
    const { root } = await openSheet(MERISIEL);

    const edit = await vi.waitFor(() => present(fieldNamed(root, 'Appearance').querySelector('button')));
    edit.click();
    await TestBed.inject(ApplicationRef).whenStable();
    const area = present(fieldNamed(root, 'Appearance').querySelector('textarea'));
    area.value = 'Tall.\nScarred.\n\nSmiles rarely.';
    area.dispatchEvent(new Event('input'));
    area.dispatchEvent(new Event('blur'));
    area.blur();

    const request = await patchRequest();
    expect(request.request.body).toMatchObject({
      patch: {
        field: 'setAppearance',
        value: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Tall.' }, { type: 'line-break' }, { type: 'text', text: 'Scarred.' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'Smiles rarely.' }] },
        ],
      },
    });
  });

  it('saves a written personality under its own field', async () => {
    const { root } = await openSheet(MERISIEL);

    const edit = await vi.waitFor(() => present(fieldNamed(root, 'Personality').querySelector('button')));
    edit.click();
    await TestBed.inject(ApplicationRef).whenStable();
    const area = present(fieldNamed(root, 'Personality').querySelector('textarea'));
    area.value = 'Dry humour.';
    area.dispatchEvent(new Event('input'));
    area.blur();

    const request = await patchRequest();
    expect(request.request.body).toMatchObject({ patch: { field: 'setPersonality' } });
  });
});
