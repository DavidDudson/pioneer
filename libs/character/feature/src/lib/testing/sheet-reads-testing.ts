import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CharacterId, CORE_RULE_LIMITS } from '@pioneer/character/domain';
import { vi } from 'vitest';

/** The character every sheet spec opens. */
const SHEET_CHARACTER = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

/** How often a read waited for is tried again, in ms. */
const POLL_INTERVAL = 5;

/** The variant rules of a character that has enabled none, which its owner may change. */
export const NO_VARIANT_RULES = { decidedBy: 'character', manageable: true, enabled: [], available: [] };

/** The packs of a character that has enabled none, which its owner may change. */
export const NO_CHARACTER_PACKS = {
  decidedBy: 'character',
  manageable: true,
  enabled: [],
  candidates: [],
  unsupported: [],
};

/** The play state the server holds, at `revision`. */
export function playOf(damage: number, temp: number, revision = 1): object {
  return { revision, play: { hp: { damage, temp } } };
}

/** The play state of a character at 0 Hit Points with the death track's `track` conditions, at `revision`. */
export function deathOf(track: object, revision = 1): object {
  return { revision, play: { hp: { damage: 15, temp: 0 }, ...track } };
}

/** The bundle a spec answers with when it needs only the sheet: `sheet` and the core rules' limits. */
export function sheetBundleOf(sheet: object): object {
  return { sheet, ruleLimits: CORE_RULE_LIMITS };
}

/**
 * Answers the sheet's one read of its character, the bundle that carries its play state, packs, variant rules and the
 * rest; left unanswered it keeps the application unstable, so a spec waiting on it never settles.
 */
export async function answerSheetBundle(bundle: object): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${SHEET_CHARACTER}/sheet` })
        .flush(bundle);
    },
    { interval: POLL_INTERVAL },
  );
}
