import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CharacterId, CORE_RULE_LIMITS } from '@pioneer/character/domain';
import { vi } from 'vitest';

/** The character every sheet spec opens. */
const SHEET_CHARACTER = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

/** How often a read waited for is tried again, in ms. */
const POLL_INTERVAL = 5;

/** No campaign approved anything. */
const NO_ITEM_APPROVALS = { approvals: [] };

async function answer(path: string, body: object): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${SHEET_CHARACTER}/${path}` })
        .flush(body);
    },
    { interval: POLL_INTERVAL },
  );
}

/**
 * Answers the sheet's reads of what its table decides: the limits, and the rule-breaking items its campaign's GM
 * approved (none, unless `approvals` says so). An unanswered request fails the spec at teardown.
 */
export async function answerRuleLimitsRead(
  limits: object = CORE_RULE_LIMITS,
  approvals: object = NO_ITEM_APPROVALS,
): Promise<void> {
  await answer('rule-limits', limits);
  await answer('item-approvals', approvals);
}
