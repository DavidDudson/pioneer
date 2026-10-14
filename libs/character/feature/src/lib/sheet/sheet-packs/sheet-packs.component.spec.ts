import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Select } from '@pioneer/frontier';
import { describe, expect, it, vi } from 'vitest';

import { id, openSheet, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';

const core = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01',
  title: 'Player Core',
  publisher: 'Paizo',
  official: true,
  requiredBy: [],
  removable: false,
};
const feats = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02',
  title: 'Amiri’s Feats',
  publisher: 'Amiri',
  official: false,
  requiredBy: [],
  removable: true,
};
const spells = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e03',
  title: 'Amiri’s Spells',
  publisher: 'Amiri',
  official: false,
  requiredBy: ['Amiri’s Feats'],
  removable: false,
};
const items = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e04',
  title: 'Amiri’s Items',
  publisher: 'Amiri',
  official: false,
  private: false,
};
const secret = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e05',
  title: 'Amiri’s Secrets',
  publisher: 'Amiri',
  official: false,
  private: true,
};

interface PacksJson {
  readonly decidedBy: 'character' | 'campaign';
  readonly campaign?: string;
  readonly manageable: boolean;
  readonly enabled: readonly object[];
  readonly candidates: readonly object[];
}

/** Every button whose text starts with `label`, in document order. */
function buttons(root: HTMLElement, label: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((candidate) => candidate.textContent.trim().startsWith(label));
}

/** Opens the Plan tab, answering the character's packs with `packs`. */
async function open(packs: PacksJson): Promise<OpenSheet> {
  const sheet = await openSheet(undefined, { characterPacks: packs });
  await vi.waitFor(() => {
    expect(sheet.root.textContent).toContain('Player Core');
  });
  return sheet;
}

/** The pack picker's control. */
function picker({ harness }: OpenSheet): Select<string> {
  const host = harness.fixture.debugElement.query(By.css('pio-sheet-pack-picker'));
  return host.query(By.directive(Select)).componentInstance as Select<string>;
}

/** Picks `packId` in the picker, the way choosing it from the overlay listbox would. */
function pick(sheet: OpenSheet, packId: string): void {
  picker(sheet).value.set(packId);
  sheet.harness.detectChanges();
}

describe('SheetPacks', () => {
  it('shows an official pack as always on, and what needs a pack that is extended', async () => {
    const { root } = await open({
      decidedBy: 'character',
      manageable: true,
      enabled: [core, feats, spells],
      candidates: [],
    });
    expect(root.textContent).toContain('Always on');
    expect(root.textContent).toContain('Needed by Amiri’s Feats');
    expect(buttons(root, 'Disable')).toHaveLength(1);
  });

  it('is read-only while a campaign decides, and says which', async () => {
    const { root } = await open({
      decidedBy: 'campaign',
      campaign: 'Abomination Vaults',
      manageable: false,
      enabled: [core, { ...feats, removable: false }],
      candidates: [],
    });
    expect(root.textContent).toContain('Abomination Vaults decides which packs this character uses.');
    expect(buttons(root, 'Disable')).toHaveLength(0);
    expect(buttons(root, 'Enable pack')).toHaveLength(0);
  });

  it('enables a picked pack, which joins the list and leaves the picker', async () => {
    const sheet = await open({
      decidedBy: 'character',
      manageable: true,
      enabled: [core],
      candidates: [items, secret],
    });
    const http = TestBed.inject(HttpTestingController);
    const { root } = sheet;

    pick(sheet, items.packId);
    present(buttons(root, 'Enable pack')[0]).click();
    await vi.waitFor(() => {
      const posted = http.expectOne({ method: 'POST', url: `/api/characters/${id}/packs` });
      expect(posted.request.body).toStrictEqual({ packId: items.packId });
      posted.flush({
        decidedBy: 'character',
        manageable: true,
        enabled: [core, { ...items, requiredBy: [], removable: true }],
        candidates: [secret],
      });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Amiri’s Items');
      expect(root.textContent).toContain('Enabled');
    });
    expect(
      picker(sheet)
        .options()
        .map((option) => option.value),
    ).toStrictEqual([secret.packId]);
    expect(picker(sheet).value()).toBe('');
  });

  it('marks a private pack in the picker', async () => {
    const sheet = await open({ decidedBy: 'character', manageable: true, enabled: [core], candidates: [secret] });
    expect(picker(sheet).options()[0]?.label).toBe('Amiri’s Secrets (private)');
  });

  it('says why a pack that cannot be used was refused', async () => {
    const sheet = await open({ decidedBy: 'character', manageable: true, enabled: [core], candidates: [items] });
    const http = TestBed.inject(HttpTestingController);

    pick(sheet, items.packId);
    present(buttons(sheet.root, 'Enable pack')[0]).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'POST', url: `/api/characters/${id}/packs` }).flush(
        {
          type: 'conflict',
          title: 'Conflict',
          status: 409,
          message: {
            key: 'character.packs.dependencyUnreadable',
            params: { pack: 'Amiri’s Items', dependency: 'Ezren’s Rules' },
          },
        },
        { status: 409, statusText: 'Conflict' },
      );
    });
    await vi.waitFor(() => {
      expect(sheet.root.textContent).toContain(
        'Amiri’s Items extends Ezren’s Rules, which you cannot read, so it cannot be enabled.',
      );
    });
  });

  it('disables on the first press, marks the row with focus kept, and offers the pack again', async () => {
    const sheet = await open({ decidedBy: 'character', manageable: true, enabled: [core, feats], candidates: [] });
    const http = TestBed.inject(HttpTestingController);
    const { root } = sheet;

    const button = present(buttons(root, 'Disable')[0]);
    button.focus();
    button.click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'DELETE', url: `/api/characters/${id}/packs/${feats.packId}` }).flush({
        decidedBy: 'character',
        manageable: true,
        enabled: [core],
        candidates: [{ ...items, packId: feats.packId, title: feats.title }],
      });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Disabled');
      expect(root.textContent).toContain('Amiri’s Feats');
    });
    expect(root.ownerDocument.activeElement).toBe(button);
    expect(
      picker(sheet)
        .options()
        .map((option) => option.value),
    ).toStrictEqual([feats.packId]);
  });

  it('says so when an enabled pack still extends the one being disabled', async () => {
    const sheet = await open({
      decidedBy: 'character',
      manageable: true,
      enabled: [core, { ...spells, removable: true }],
      candidates: [],
    });
    const http = TestBed.inject(HttpTestingController);

    present(buttons(sheet.root, 'Disable')[0]).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'DELETE', url: `/api/characters/${id}/packs/${spells.packId}` }).flush(
        {
          type: 'conflict',
          title: 'Conflict',
          status: 409,
          message: { key: 'character.packs.requiredByRefusal', params: { packs: 'Amiri’s Feats' } },
        },
        { status: 409, statusText: 'Conflict' },
      );
    });
    await vi.waitFor(() => {
      expect(sheet.root.textContent).toContain('Amiri’s Feats still extend this pack. Disable them first.');
    });
  });
});
