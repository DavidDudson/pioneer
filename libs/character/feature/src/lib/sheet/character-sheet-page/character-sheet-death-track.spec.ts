import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { RANDOM_SOURCE } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { deathOf, id, MERISIEL, openSheet, playOf, present } from '../../testing/sheet-page-harness';
import { render, textOf } from '../../testing/sheet-tabs-testing';

const PLAY_URL = `/api/characters/${id}/play`;

const CLERIC_MERISIEL = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric') } },
};

function deathTrackOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-death-track'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...deathTrackOf(root).querySelectorAll('button')].find((button) => textOf(button).startsWith(name)));
}

function typeValue(root: HTMLElement, value: number): void {
  const input = present(deathTrackOf(root).querySelector<HTMLInputElement>('input[aria-label="Condition value"]'));
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
  render();
}

/** The d20 faces the next recovery checks roll. */
function rolling(...faces: readonly number[]): void {
  TestBed.configureTestingModule({
    providers: [{ provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) }],
  });
}

describe('CharacterSheetPage death track', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([]);
  }, PREBUILD_TIMEOUT);

  it('shows dying, wounded and doomed', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: deathOf({ dying: 2, wounded: 1, doomed: 1 }) });

    await vi.waitFor(() => {
      const text = textOf(deathTrackOf(root));
      expect(text).toContain('Dying 2');
      expect(text).toContain('Wounded 1');
      expect(text).toContain('Doomed 1');
      expect(text).not.toContain('Dead');
    });
  });

  it('shows a dead character as dead, with no recovery check to roll', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: deathOf({ dying: 4, dead: true }) });

    await vi.waitFor(() => {
      expect(textOf(deathTrackOf(root))).toContain('Dead');
    });
    expect(textOf(deathTrackOf(root))).not.toContain('Recovery check');
  });

  it('offers a recovery check only to a dying character', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(0, 0) });

    await vi.waitFor(() => {
      expect(textOf(deathTrackOf(root))).toContain('Dying 0');
    });
    expect(textOf(deathTrackOf(root))).not.toContain('Recovery check');
  });

  it('rolls the recovery check against DC 10 plus dying, shows it on a roll card and sends its degree', async () => {
    rolling(15);
    const { root } = await openSheet(CLERIC_MERISIEL, { play: deathOf({ dying: 2 }) });
    await vi.waitFor(() => {
      expect(textOf(deathTrackOf(root))).toContain('Recovery check (DC 12)');
    });

    buttonOf(root, 'Recovery check').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'recoveryCheck', degree: 'success' },
      });
      request.flush(deathOf({ dying: 1 }, 2));
    });
    await vi.waitFor(() => {
      expect(deathTrackOf(root).querySelector('pio-roll-card')).not.toBeNull();
      expect(textOf(deathTrackOf(root))).toContain('Dying 1');
    });
  });

  it('sends a natural 1 against the DC as a critical failure', async () => {
    rolling(1);
    const { root } = await openSheet(CLERIC_MERISIEL, { play: deathOf({ dying: 1 }) });
    await vi.waitFor(() => {
      expect(textOf(deathTrackOf(root))).toContain('Recovery check (DC 11)');
    });

    buttonOf(root, 'Recovery check').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({ command: { field: 'recoveryCheck', degree: 'criticalFailure' } });
      request.flush(deathOf({ dying: 3 }, 2));
    });
  });

  it('sets doomed to the value typed', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(0, 0) });
    await vi.waitFor(() => {
      expect(textOf(deathTrackOf(root))).toContain('Doomed 0');
    });

    typeValue(root, 2);
    buttonOf(root, 'Set doomed').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'setDoomed', doomed: 2 } });
      request.flush(deathOf({ doomed: 2 }, 2));
    });
  });
});
