import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';

const PLAY_URL = `/api/characters/${id}/play`;

const PACKS = cutTo(FEAT_CONTENT_KINDS);

const BARD = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('bard') }, spellAccess: [] },
};

/** The play state of a hurt character with hero points `heroSpent` spent. */
function playOf(damage: number, heroSpent: number, revision = 1): object {
  return { revision, play: { hp: { damage, temp: 0 }, resources: { 'hero-points': heroSpent } } };
}

function restOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-rest'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...restOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

describe('CharacterSheetPage rest actions', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('offers each action without running any of them', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(5, 0), packs: PACKS });

    await vi.waitFor(() => {
      expect([...restOf(root).querySelectorAll('button')].map((button) => textOf(button))).toStrictEqual([
        'Rest',
        'Daily preparations',
        'Refocus',
        'Start of session',
      ]);
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('previews what Rest restores, then applies it as one command when confirmed', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(5, 0), packs: PACKS });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Rest').click();

    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toMatch(/Rest restores:\s*\d+ Hit Points/u);
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });

    buttonOf(root, 'Confirm').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'rest' } });
      request.flush(playOf(4, 0, 2));
    });
    await vi.waitFor(() => {
      expect(restOf(root).textContent).not.toContain('Rest restores');
    });
  });

  it('previews the hero points a start of session sets, and can be cancelled', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(0, 3), packs: PACKS });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Start of session').click();

    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toContain('Hero Points from 0 to 1');
    });
    buttonOf(root, 'Cancel').click();
    await vi.waitFor(() => {
      expect(textOf(restOf(root))).not.toContain('Hero Points from');
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('says so when an action has nothing to restore', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(0, 0), packs: PACKS });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Refocus').click();

    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toContain('Nothing to restore.');
    });
  });
});
