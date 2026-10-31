import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RouterTestingHarness } from '@angular/router/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { pickLoadedRow } from '../../testing/option-picker-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core's character kinds and its actions. */
const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Action]);

const AVOID_NOTICE = 'c51e323a-8364-5dc1-89f7-4f3216a699a8';

const openSheet = openerAt(SheetMode.Exploration);

/** The play state of a full-health character doing `exploration`, at `revision`. */
function playWith(exploration: string | undefined, revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, ...(exploration === undefined ? {} : { exploration }) } };
}

function pickerOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-exploration-activity'));
}

async function choose(harness: RouterTestingHarness, root: HTMLElement, label: string): Promise<void> {
  await pickLoadedRow(harness, pickerOf(root), { matches: (each) => each === label });
  await TestBed.inject(ApplicationRef).whenStable();
}

describe('CharacterSheetPage exploration activity', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows none picked on a character that has not picked one', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(undefined), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(pickerOf(root))).toContain('None');
    });
  });

  it('shows the activity the server read', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(AVOID_NOTICE), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(pickerOf(root))).toContain('Avoid Notice');
    });
  });

  it('sends the activity picked at the revision last read, and shows what the server answers', async () => {
    const { harness, root } = await openSheet(MERISIEL, { play: playWith(undefined), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(pickerOf(root))).toContain('None');
    });

    await choose(harness, root, 'Avoid Notice');

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'setExplorationActivity', activity: AVOID_NOTICE },
      });
      request.flush({ ...playWith(AVOID_NOTICE, 2), events: [] });
    });
    await vi.waitFor(() => {
      expect(textOf(pickerOf(root))).toContain('Avoid Notice');
    });
  });

  it('clears the activity when None is picked', async () => {
    const { harness, root } = await openSheet(MERISIEL, { play: playWith(AVOID_NOTICE), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(pickerOf(root))).toContain('Avoid Notice');
    });

    await choose(harness, root, 'None');

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'setExplorationActivity' },
      });
      request.flush({ ...playWith(undefined, 2), events: [] });
    });
  });
});
