import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId, playerCoreId } from '@pioneer/character/domain/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { KeyAttributePicker, SubclassPicker } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickRow } from '../../testing/origin-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

const CLERIC = playerCoreClassId('cleric');
const DOCTRINE = `${playerCoreId(ContentKind.ClassFeature, 'doctrine')}:0`;
const WARPRIEST = playerCoreId(ContentKind.ClassFeature, 'warpriest');
const RACKET = `${playerCoreId(ContentKind.ClassFeature, 'rogues-racket')}:0`;

/** Merisiel as a rogue, with `racket` picked when given. */
function rogue(racket?: string): object {
  const picks = racket === undefined ? {} : { [RACKET]: playerCoreId(ContentKind.ClassFeature, racket) };
  return { ...MERISIEL, build: { choices: { class: playerCoreClassId('rogue'), ...picks } } };
}

/** Merisiel as a cleric, with `choices` picked besides. */
function cleric(choices: Readonly<Record<string, string>> = {}): object {
  return { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, class: CLERIC, ...choices } } };
}

const CLERIC_SLOT = {
  status: 'filled',
  key: 'class',
  subject: { kind: 'root', content: 'class' },
  selection: CLERIC,
  selectionName: 'Cleric',
};

/** The labels of the Identity section's inline fields. */
function labels(root: HTMLElement): string[] {
  const identity = present(root.querySelector('section[aria-labelledby="sheet-identity"]'));
  return [...identity.querySelectorAll('fr-inline-field')].map((field) =>
    present(field.querySelector('fr-text')).textContent.trim(),
  );
}

function fieldNamed(root: HTMLElement, label: string): HTMLElement {
  return present(
    [...root.querySelectorAll<HTMLElement>('fr-inline-field')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim() === label,
    ),
  );
}

describe('CharacterSheetPage class', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('offers the class’s subclass beneath it, and no key attribute when the class allows one', async () => {
    const { root } = await openSheet(cleric(), { slots: [CLERIC_SLOT] });

    await vi.waitFor(() => {
      expect(labels(root)).toStrictEqual(['Name', 'Ancestry', 'Heritage', 'Background', 'Level', 'Class', 'Subclass']);
    });
    expect(fieldNamed(root, 'Class').textContent).toContain('Cleric');
  });

  it('asks a fighter for a key attribute, with no subclass', async () => {
    const fighter = { ...MERISIEL, build: { choices: { class: playerCoreClassId('fighter') } } };
    const { root } = await openSheet(fighter);

    await vi.waitFor(() => {
      expect(labels(root)).toContain('Key attribute');
    });
    expect(labels(root)).not.toContain('Subclass');
  });

  it('asks a thief rogue for no key attribute: Dexterity is its only one', async () => {
    const { root } = await openSheet(rogue('thief'));

    await vi.waitFor(() => {
      expect(labels(root)).toContain('Subclass');
    });
    expect(labels(root)).not.toContain('Key attribute');
  });

  it('asks a ruffian rogue for a key attribute, which its racket widens to Strength', async () => {
    const { root } = await openSheet(rogue('ruffian'));
    await pickRow(root, { label: 'Key attribute', type: KeyAttributePicker }, 'Strength');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: 'boost:1:class:0', selection: 'str' },
    });
  });

  it('lists the class features, each with the class and level it came from', async () => {
    const { root } = await openSheet(cleric({ [DOCTRINE]: WARPRIEST }));
    const features = present(root.querySelector('section[aria-labelledby="sheet-features"]'));

    await vi.waitFor(() => {
      expect([...features.querySelectorAll('fr-list-item')].map((item) => item.textContent.trim())).toContain(
        'Warpriestfrom Cleric, level 1',
      );
    });
    expect(features.textContent).toContain('Doctrine');
  });

  it('names the picked subclass in the build summary', async () => {
    const doctrine = {
      status: 'filled',
      key: DOCTRINE,
      subject: { kind: 'choice', entry: playerCoreId(ContentKind.ClassFeature, 'doctrine'), entryName: 'Doctrine' },
      selection: WARPRIEST,
      selectionName: 'Warpriest',
    };
    const { root } = await openSheet(cleric({ [DOCTRINE]: WARPRIEST }), {
      slots: [CLERIC_SLOT, doctrine],
    });
    const build = present(root.querySelector('section[aria-labelledby="sheet-build"]'));

    await vi.waitFor(() => {
      const subclass = [...build.querySelectorAll('fr-description-item')].find(
        (item) => item.querySelector('[role="term"]')?.textContent.trim() === 'Subclass',
      );
      expect(subclass?.querySelector('[role="definition"]')?.textContent.trim()).toBe('Warpriest');
    });
  });

  it('picks a subclass in the slot the class feature opens', async () => {
    const { root } = await openSheet(cleric());
    await pickRow(root, { label: 'Subclass', type: SubclassPicker }, 'Warpriest');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: DOCTRINE, selection: WARPRIEST },
    });
  });

  it('picks a fighter’s key attribute in its class boost slot, from the attributes it allows', async () => {
    const fighter = { ...MERISIEL, build: { choices: { class: playerCoreClassId('fighter') } } };
    const { root } = await openSheet(fighter);
    await pickRow(root, { label: 'Key attribute', type: KeyAttributePicker }, 'Dexterity');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: 'boost:1:class:0', selection: 'dex' },
    });
  });
});
