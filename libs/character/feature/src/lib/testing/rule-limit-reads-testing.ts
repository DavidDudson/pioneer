import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CharacterId } from '@pioneer/character/domain';
import { vi } from 'vitest';

import type { JsonObject } from './json-fixture';

/** The character every sheet spec opens. */
const SHEET_CHARACTER = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

/** How often a read waited for is tried again, in ms. */
const POLL_INTERVAL = 5;

/** No campaign approved anything. */
const NO_ITEM_APPROVALS = { approvals: [] };

/**
 * Answers the read of the rule-breaking items the character's campaign's GM approved (none, unless `approvals` says
 * so), which a panel that shows them makes once it opens. An unanswered request fails the spec at teardown.
 */
export async function answerItemApprovalsRead(approvals: JsonObject = NO_ITEM_APPROVALS): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${SHEET_CHARACTER}/item-approvals` })
        .flush(approvals);
    },
    { interval: POLL_INTERVAL },
  );
}

/** The character has no companions. */
const NO_COMPANIONS = { companions: [] };

/**
 * Answers the read of the character's companions (none, unless `companions` says so), which the Encounter tab makes to
 * know whether to list its Familiar section. An unanswered request fails the spec at teardown.
 */
export async function answerCompanionsRead(companions: JsonObject = NO_COMPANIONS): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${SHEET_CHARACTER}/companions` })
        .flush(companions);
    },
    { interval: POLL_INTERVAL },
  );
}
