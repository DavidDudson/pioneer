import { TestBed } from '@angular/core/testing';
import { IdentityContract, TableDensity, UserId } from '@pioneer/identity/domain';
import type { TableViewPreferences, User } from '@pioneer/identity/domain';
import { newId } from '@pioneer/shared/kernel';
import { ApiClient } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { AccountTableViews } from './account-table-views';
import { SessionStore } from './session-store';

/** What the spec's `ApiClient` is called with. */
interface TableViewInput {
  readonly params: { readonly entity: string };
  readonly body?: TableViewPreferences;
}

type TableViewEndpoint = typeof IdentityContract.tableView | typeof IdentityContract.saveTableView;

/** The spec's `ApiClient.call`: it answers a read with what the account stored, and a save with nothing. */
type Call = (endpoint: TableViewEndpoint, input: TableViewInput) => Promise<TableViewPreferences>;

/** The one thing a spec needs of a user: that there is one. */
const SIGNED_IN: Pick<User, 'id'> = { id: UserId.parse(newId()) };

interface Fakes {
  readonly views: AccountTableViews;
  readonly call: Mock<Call>;
}

function setup(signedIn: boolean, stored: TableViewPreferences = {}): Fakes {
  const call = vi.fn<Call>(async (endpoint) => (endpoint === IdentityContract.tableView ? stored : {}));
  const user = signedIn ? SIGNED_IN : undefined;

  TestBed.configureTestingModule({
    providers: [
      { provide: ApiClient, useValue: { call } },
      { provide: SessionStore, useValue: { whenKnown: async (): Promise<typeof user> => user } },
    ],
  });

  return { views: TestBed.inject(AccountTableViews), call };
}

describe('account table views', () => {
  it('loads what the account stored the first time a table asks', async () => {
    const { views } = setup(true, { density: TableDensity.Compact });
    expect(views.stored('characters')).toStrictEqual({});
    await vi.waitFor(() => {
      expect(views.stored('characters')).toStrictEqual({ density: TableDensity.Compact });
    });
  });

  it('shows a change at once and saves it without a save step', async () => {
    const { views, call } = setup(true);
    await views.save('characters', { density: TableDensity.Compact });
    expect(views.stored('characters')).toStrictEqual({ density: TableDensity.Compact });
    expect(call).toHaveBeenCalledWith(IdentityContract.saveTableView, {
      params: { entity: 'characters' },
      body: { density: TableDensity.Compact },
    });
  });

  it('saves nothing for a signed-out visitor, but still shows the change', async () => {
    const { views, call } = setup(false);
    await views.save('characters', { density: TableDensity.Compact });
    expect(call).not.toHaveBeenCalled();
    expect(views.stored('characters')).toStrictEqual({ density: TableDensity.Compact });
  });

  it('keeps the change on screen when the save fails, and never rejects', async () => {
    const { views, call } = setup(true);
    call.mockRejectedValueOnce(new Error('offline'));
    await expect(views.save('characters', { density: TableDensity.Compact })).resolves.toBeUndefined();
    expect(views.stored('characters')).toStrictEqual({ density: TableDensity.Compact });
  });
});
