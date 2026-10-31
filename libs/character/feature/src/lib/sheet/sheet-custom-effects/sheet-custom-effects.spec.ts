import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { describe, expect, it, vi } from 'vitest';

import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

const AUTHOR = '00000000-0000-4000-8000-00000000de01';
const EFFECT = '00000000-0000-4000-8000-00000000fe01';

const FIGHTER = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' } },
};

const BLESSING = {
  id: EFFECT,
  name: 'Blessing of the Hearth',
  reason: 'Festival boon',
  lines: [
    { target: 'perception', value: 1, type: 'status' },
    { target: 'save:will', value: 2 },
  ],
  by: AUTHOR,
  byRole: 'player',
  at: '2026-10-30T10:00:00.000Z',
  enabled: true,
  toggles: [],
};

const NAMES = [{ userId: AUTHOR, displayName: 'Ada' }];

async function openWith(customEffects: readonly object[]): Promise<HTMLElement> {
  const { root } = await openSheet({ ...FIGHTER, customEffects }, { authors: NAMES });
  return root;
}

async function section(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-custom-effects')));
}

async function listed(root: HTMLElement): Promise<string> {
  const found = await vi.waitFor(async () => {
    const element = await section(root);
    expect(textOf(element)).toContain('Perception');
    return element;
  });
  return textOf(found);
}

function type(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  element.value = text;
  element.dispatchEvent(new Event('input'));
  element.dispatchEvent(new Event('blur'));
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function button(root: HTMLElement, label: string): HTMLButtonElement {
  return present(root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`));
}

async function patchOf(): Promise<unknown> {
  const request = await vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
  );
  return request.request.body;
}

describe('CharacterSheet custom effects section', () => {
  it('says what a custom effect is when the character has none', async () => {
    const text = textOf(await section(await openWith([])));

    expect(text).toContain('No custom effects');
    expect(text).toContain('a named bundle of modifiers');
  });

  it('lists an effect with its state, reason, each line and who added it', async () => {
    const text = await listed(await openWith([BLESSING]));

    expect(text).toContain('Blessing of the Hearth');
    expect(text).toContain('On');
    expect(text).toContain('Festival boon');
    expect(text).toContain('Perception: +1 status');
    expect(text).toContain('Added by Ada');
  });

  it('switches an effect off with one press, and shows it as off with who switched it', async () => {
    const root = await openWith([BLESSING]);
    await listed(root);
    button(root, 'Switch off Blessing of the Hearth').click();

    await expect(patchOf()).resolves.toMatchObject({
      patch: { field: 'toggleCustomEffect', id: EFFECT, enabled: false },
    });
  });

  it('shows an effect switched off as off, offers to switch it on, and lists the switch', async () => {
    const off = {
      ...BLESSING,
      enabled: false,
      toggles: [{ by: AUTHOR, byRole: 'player', at: '2026-10-31T10:00:00.000Z', enabled: false }],
    };
    const root = await openWith([off]);
    const text = await listed(root);

    expect(text).toContain('Off');
    expect(text).toContain('Switched Off by Ada');
    button(root, 'Switch on Blessing of the Hearth').click();
    await expect(patchOf()).resolves.toMatchObject({
      patch: { field: 'toggleCustomEffect', id: EFFECT, enabled: true },
    });
  });

  it('removes an effect only with a reason and a second press that names it', async () => {
    const root = await openWith([BLESSING]);
    await listed(root);
    const remove = button(root, 'Remove Blessing of the Hearth');
    expect(remove.disabled).toBe(true);

    type(present(root.querySelector<HTMLInputElement>('pio-sheet-custom-effect-row input')), 'Festival over');
    await TestBed.inject(ApplicationRef).whenStable();
    remove.click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(textOf(remove)).toContain('Press again to remove Blessing of the Hearth');
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: `/api/characters/${id}` });
    remove.click();
    await expect(patchOf()).resolves.toMatchObject({
      patch: { field: 'removeCustomEffect', id: EFFECT, reason: 'Festival over' },
    });
  });

  it('marks an effect the GM set, lets the player switch it and leaves no way to remove it', async () => {
    const root = await openWith([{ ...BLESSING, byRole: 'gm' }]);
    const text = await listed(root);

    expect(text).toContain('GM');
    expect(text).toContain('Your GM set this, so only your GM can remove it.');
    expect(root.querySelector('button[aria-label="Switch off Blessing of the Hearth"]')).not.toBeNull();
    expect(root.querySelector('button[aria-label="Remove Blessing of the Hearth"]')).toBeNull();
  });

  it('keeps Add effect off until the effect has a name, a reason and a line', async () => {
    const root = await openWith([]);
    const form = await vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-custom-effect-form')));
    const submit = present(form.querySelector<HTMLButtonElement>('button[type="submit"]'));

    expect(submit.disabled).toBe(true);
    expect(textOf(form)).toContain('Add at least one line');
  });
});
