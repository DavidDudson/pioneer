import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, openerAt, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core's character kinds and the effects of Divine Mysteries. */
const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Effect]);

const EMPOWERED_ONSLAUGHT = '963ae779-6771-5e53-a0a5-668aa2ee79ca';
const PLANT_FORM = '364d6d32-3a80-511d-95b1-952f32748076';
const FIRST = '00000000-0000-4000-8000-000000000001';

const plant = {
  id: FIRST,
  effect: PLANT_FORM,
  source: { kind: 'self' },
  form: 'plant-form:flytrap',
  rank: 6,
};

/** The play state of a full-health character with `effects` on it, at `revision`. */
function playWith(effects: readonly object[], revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, effects } };
}

const openExploration = openerAt(SheetMode.Exploration);

function bannerOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-form'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...bannerOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

describe('CharacterSheetPage form header', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('names the form, its rank and Dismiss in the header', async () => {
    const { root } = await openSheet(undefined, { play: playWith([plant]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(bannerOf(root))).toContain('In form: Spell Effect: Plant Form');
    });
    expect(textOf(bannerOf(root))).toContain('Flytrap form');
    expect(textOf(bannerOf(root))).toContain('Rank 6');
    expect(buttonOf(root, 'Dismiss')).toBeDefined();
  });

  it('says on Exploration that the appearance is not part of the form', async () => {
    const { root } = await openExploration(undefined, { play: playWith([plant]), packs: PACKS });

    await vi.waitFor(() => {
      const section = present(root.querySelector('section[aria-labelledby="sheet-roleplay"]'));
      expect(textOf(section)).toContain('In form: Spell Effect: Plant Form. The appearance below is your own.');
    });
  });

  it('shows nothing when the effects on the character are not a form', async () => {
    const onslaught = { id: FIRST, effect: EMPOWERED_ONSLAUGHT, source: { kind: 'self' }, badge: 1 };
    const { root } = await openSheet(undefined, { play: playWith([onslaught]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(root)).toContain('Empowered Onslaught');
    });
    expect(textOf(bannerOf(root))).toBe('');
  });

  it('dismisses the form, which ends the effect', async () => {
    const { root } = await openSheet(undefined, { play: playWith([plant]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(bannerOf(root))).toContain('In form');
    });

    buttonOf(root, 'Dismiss').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({ command: { field: 'removeEffect', id: FIRST } });
      request.flush(playWith([], 2));
    });
    await vi.waitFor(() => {
      expect(textOf(bannerOf(root))).toBe('');
    });
  });

  it('shows the base sheet for reference without ending the form, and back again', async () => {
    const { root } = await openSheet(undefined, { play: playWith([plant]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(bannerOf(root))).toContain('In form');
    });
    expect(textOf(bannerOf(root))).not.toContain('for reference only');

    buttonOf(root, 'Show base sheet').click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(textOf(bannerOf(root))).toContain('Base sheet, for reference only. The form is still active.');
    expect(textOf(bannerOf(root))).toContain('In form');
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });

    buttonOf(root, 'Show base sheet').click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(textOf(bannerOf(root))).not.toContain('for reference only');
  });
});
