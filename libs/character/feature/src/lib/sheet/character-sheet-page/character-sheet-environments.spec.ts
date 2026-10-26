import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { gilledFixtureId, ITEM_FIXTURE_FILES, underwaterFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core's character kinds, and the fixture pack that holds the underwater environment. */
const PACKS = [...cutTo(CHARACTER_CONTENT_KINDS), ITEM_FIXTURE_FILES];

const UNDERWATER = underwaterFixtureId();
const NO_SPEECH = "You can't speak underwater.";

const openSheet = openerAt(SheetMode.Exploration);

/** The play state of a full-health character in `environments`, at `revision`. */
function playIn(environments: readonly string[], revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, environments } };
}

function sectionOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-environments'));
}

describe('CharacterSheetPage environments', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('offers each environment of the content, off for a character in none, with no restriction shown', async () => {
    const { root } = await openSheet(MERISIEL, { play: playIn([]), packs: PACKS });

    await vi.waitFor(() => {
      const toggle = present(sectionOf(root).querySelector<HTMLElement>('button'));
      expect(textOf(toggle)).toContain('Underwater');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
    });
    expect(textOf(sectionOf(root))).not.toContain(NO_SPEECH);
  });

  it('shows an environment the character is in as on, with what it forbids and why', async () => {
    const { root } = await openSheet(MERISIEL, { play: playIn([UNDERWATER]), packs: PACKS });

    await vi.waitFor(() => {
      const toggle = present(sectionOf(root).querySelector<HTMLElement>('button'));
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      expect(textOf(sectionOf(root))).toContain(NO_SPEECH);
    });
  });

  it('sends the environment turned on at the revision last read, and shows what the server answers', async () => {
    const { root } = await openSheet(MERISIEL, { play: playIn([]), packs: PACKS });
    const toggle = await vi.waitFor(() => present(sectionOf(root).querySelector<HTMLElement>('button')));

    toggle.click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'setEnvironment', environment: UNDERWATER, active: true },
      });
      request.flush({ ...playIn([UNDERWATER], 2), events: [] });
    });
    await vi.waitFor(() => {
      expect(textOf(sectionOf(root))).toContain(NO_SPEECH);
    });
  });

  it('says what lifts a restriction, and shows it no longer forbids', async () => {
    const gilled = {
      id: '00000000-0000-4000-8000-000000000401',
      condition: gilledFixtureId(),
      duration: { kind: 'unlimited' },
    };
    const play = {
      revision: 1,
      play: { hp: { damage: 0, temp: 0 }, environments: [UNDERWATER], conditions: [gilled] },
    };
    const { root } = await openSheet(MERISIEL, { play, packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(sectionOf(root))).toContain(`${NO_SPEECH} Lifted by Gilled.`);
    });
  });
});
