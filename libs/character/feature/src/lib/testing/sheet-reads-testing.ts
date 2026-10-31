import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CharacterId } from '@pioneer/character/domain';
import { vi } from 'vitest';

/** The character every sheet spec opens. */
const SHEET_CHARACTER = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

/** How often a read waited for is tried again, in ms. */
const POLL_INTERVAL = 5;

/** The variant rules of a character that has enabled none, which its owner may change. */
const NO_VARIANT_RULES = { decidedBy: 'character', manageable: true, enabled: [], available: [] };

/** The packs of a character that has enabled none, which its owner may change. */
const NO_CHARACTER_PACKS = { decidedBy: 'character', manageable: true, enabled: [], candidates: [] };

/** The play state the server holds, at `revision`. */
export function playOf(damage: number, temp: number, revision = 1): object {
  return { revision, play: { hp: { damage, temp } } };
}

/** The play state of a character at 0 Hit Points with the death track's `track` conditions, at `revision`. */
export function deathOf(track: object, revision = 1): object {
  return { revision, play: { hp: { damage: 15, temp: 0 }, ...track } };
}

/**
 * Answers the sheet's read of its play state, made once the character is selected; left unanswered it keeps the
 * application unstable, so a spec waiting on it never settles.
 */
export async function answerPlayRead(play: object = playOf(0, 0)): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${SHEET_CHARACTER}/play` })
        .flush(play);
    },
    { interval: POLL_INTERVAL },
  );
}

/** Answers the sheet's read of one of the character's `/api/characters/:id/<path>` resources with `body`. */
async function answerRead(path: string, body: object): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${SHEET_CHARACTER}/${path}` })
        .flush(body);
    },
    { interval: POLL_INTERVAL },
  );
}

/** Answers the read of the character's packs; the content registry waits for it on every tab. */
export async function answerPacksRead(packs: object = NO_CHARACTER_PACKS): Promise<void> {
  await answerRead('packs', packs);
}

/** Answers the read of the character's variant rules; the content registry also waits for it. */
export async function answerVariantRulesRead(rules: object = NO_VARIANT_RULES): Promise<void> {
  await answerRead('variant-rules', rules);
}
