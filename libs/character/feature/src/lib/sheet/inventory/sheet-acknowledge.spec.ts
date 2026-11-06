import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { INVESTED_MAX, ItemOrigin, RuleBreak } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { button, id, openInventory, row, settle, VALEROS } from '../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';

const ACKNOWLEDGEMENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function cloakId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

/** One cloak more than can be invested, all imported and invested, each named so a row can be found. */
const OVER_INVESTED = {
  ...VALEROS,
  inventory: {
    ...VALEROS.inventory,
    items: Array.from({ length: INVESTED_MAX + 1 }, (_unused, index) => ({
      id: cloakId(index),
      item: itemFixtureId(ItemFixture.Cloak),
      quantity: 1,
      name: `Cloak ${index}`,
      carry: { state: 'worn' },
      invested: true,
      origin: ItemOrigin.Import,
    })),
  },
};

/** The cloak that takes the invested count past the limit, the one that breaks the rule. */
const OVER = `Cloak ${INVESTED_MAX}`;

const OUTSIDE_A_CAMPAIGN = { acknowledgeable: true, approvals: [] };
const acknowledgedOnce = {
  acknowledgeable: true,
  approvals: [
    {
      item: cloakId(INVESTED_MAX),
      rule: RuleBreak.Invested,
      value: INVESTED_MAX + 1,
      acknowledgement: ACKNOWLEDGEMENT,
    },
  ],
};

interface ApprovalsBody {
  readonly acknowledgeable: boolean;
  readonly approvals: readonly object[];
}

/** The write invalidates the approvals, so the panel asks for them again: answer that read. */
async function answerApprovalsRefetch(body: ApprovalsBody): Promise<void> {
  const refetch = await vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne({
      method: 'GET',
      url: `/api/characters/${id}/item-approvals`,
    }),
  );
  refetch.flush(body);
}

describe('acknowledging a rule-breaking item on a character outside a campaign', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('offers the owner Acknowledge on the item that breaks the rule, and on no other', async () => {
    const section = await openInventory(OVER_INVESTED, OVER_INVESTED.inventory.items.length, OUTSIDE_A_CAMPAIGN);
    await vi.waitFor(() => {
      expect(row(section, OVER).textContent).toContain(`Acknowledge the warnings on ${OVER}`);
    });
    expect(row(section, 'Cloak 0').textContent).not.toContain('Acknowledge the warnings');
  });

  it('sends the acknowledgement, then shows the item as acknowledged by the owner instead of warning', async () => {
    const section = await openInventory(OVER_INVESTED, OVER_INVESTED.inventory.items.length, OUTSIDE_A_CAMPAIGN);
    await vi.waitFor(() => {
      button(row(section, OVER), `Acknowledge the warnings on ${OVER}`).click();
    });
    const sent = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({
        method: 'POST',
        url: `/api/characters/${id}/item-acknowledgements`,
      }),
    );
    expect(sent.request.body).toStrictEqual({ item: cloakId(INVESTED_MAX), rule: RuleBreak.Invested });
    sent.flush(acknowledgedOnce);
    await answerApprovalsRefetch(acknowledgedOnce);
    await settle();

    await vi.waitFor(() => {
      expect(row(section, OVER).textContent).toContain('Acknowledged by the owner');
    });
    expect(row(section, OVER).textContent).not.toContain('Breaks a rule');
  });

  it('offers taking an acknowledgement back, and sends it', async () => {
    const section = await openInventory(OVER_INVESTED, OVER_INVESTED.inventory.items.length, acknowledgedOnce);
    await vi.waitFor(() => {
      button(row(section, OVER), `Take back the acknowledgement on ${OVER}`).click();
    });
    const sent = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({
        method: 'DELETE',
        url: `/api/characters/${id}/item-acknowledgements/${ACKNOWLEDGEMENT}`,
      }),
    );
    sent.flush(OUTSIDE_A_CAMPAIGN);
    await answerApprovalsRefetch(OUTSIDE_A_CAMPAIGN);
    await settle();

    await vi.waitFor(() => {
      expect(row(section, OVER).textContent).toContain('Breaks a rule');
    });
  });

  it('offers nothing in a campaign, whose GM approves', async () => {
    const section = await openInventory(OVER_INVESTED, OVER_INVESTED.inventory.items.length, {
      acknowledgeable: false,
      approvals: [],
    });
    await settle();
    expect(row(section, OVER).textContent).not.toContain('Acknowledge the warnings');
  });
});
