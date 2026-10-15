import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { ClassPicker, SubclassPicker } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickRow } from '../../testing/origin-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

/** The core rules pack's Dual Class, as the character's list names it. */
const dualClass = {
  variantId: 'c46b73e0-50a1-523c-a265-c4037861c84e',
  name: 'Dual Class',
  packTitle: 'Core Rules',
};
const DUAL_CLASS_ON = { decidedBy: 'character', manageable: true, enabled: [dualClass], available: [] };

const FIGHTER = playerCoreClassId('fighter');
const CLERIC = playerCoreClassId('cleric');

/** Merisiel as a fighter, with a cleric as her second class when `second` is set. */
function fighter(second = false): object {
  const choices = { class: FIGHTER, ...(second ? { 'second-class': CLERIC } : {}) };
  return { ...MERISIEL, build: { choices } };
}

/** The labels of the Identity section's inline fields. */
function labels(root: HTMLElement): string[] {
  const identity = present(root.querySelector('section[aria-labelledby="sheet-identity"]'));
  return [...identity.querySelectorAll('fr-inline-field')].map((field) =>
    present(field.querySelector('fr-text')).textContent.trim(),
  );
}

describe('CharacterSheetPage with Dual Class', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('has no second class while the variant is off', async () => {
    const { root } = await openSheet(fighter(true));

    await vi.waitFor(() => {
      expect(labels(root)).toContain('Key attribute');
    });
    expect(labels(root)).not.toContain('Second class');
  });

  it('offers a second class beside the first once the variant is on', async () => {
    const { root } = await openSheet(fighter(), { characterVariantRules: DUAL_CLASS_ON });

    await vi.waitFor(() => {
      expect(labels(root)).toContain('Second class');
    });
  });

  it('picks the second class in the slot of its own', async () => {
    const { root } = await openSheet(fighter(), { characterVariantRules: DUAL_CLASS_ON });
    await pickRow(root, { label: 'Second class', type: ClassPicker }, 'Cleric');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: 'second-class', selection: CLERIC },
    });
  });

  it('offers the second class its own subclass', async () => {
    const { root } = await openSheet(fighter(true), { characterVariantRules: DUAL_CLASS_ON });

    await vi.waitFor(() => {
      expect(labels(root)).toContain('Second subclass');
    });
    await pickRow(root, { label: 'Second subclass', type: SubclassPicker }, 'Warpriest');
    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    const body = request.request.body as { patch: { field: string; selection: unknown } };
    expect(body.patch.field).toBe('selectSlot');
    expect(body.patch.selection).toBeTypeOf('string');
  });

  it('lists the features of both classes, each from its own class', async () => {
    const { root } = await openSheet(fighter(true), { characterVariantRules: DUAL_CLASS_ON });
    const features = present(root.querySelector('section[aria-labelledby="sheet-features"]'));

    await vi.waitFor(() => {
      const items = [...features.querySelectorAll('fr-list-item')].map((item) => item.textContent.trim());
      expect(items).toContain('Reactive Strikefrom Fighter, level 1');
      expect(items).toContain('Doctrinefrom Cleric, level 1');
    });
  });
});
