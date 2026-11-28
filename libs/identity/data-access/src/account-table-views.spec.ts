import { ErrorHandler } from '@angular/core';
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

const COMPACT: TableViewPreferences = { density: TableDensity.Compact };

interface Fakes {
  readonly views: AccountTableViews;
  readonly call: Mock<Call>;
  readonly reported: Mock<(error: Error) => void>;
}

function setup(signedIn: boolean, call: Mock<Call>): Fakes {
  const user = signedIn ? SIGNED_IN : undefined;
  const reported = vi.fn<(error: Error) => void>();

  TestBed.configureTestingModule({
    providers: [
      { provide: ApiClient, useValue: { call } },
      {
        provide: SessionStore,
        useValue: {
          whenKnown: async (): Promise<typeof user> => user,
          known: (): boolean => true,
          user: (): typeof user => user,
        },
      },
      { provide: ErrorHandler, useValue: { handleError: reported } },
    ],
  });

  return { views: TestBed.inject(AccountTableViews), call, reported };
}

/** An account holding `stored`, which answers every save with nothing. */
function holding(stored: TableViewPreferences): Mock<Call> {
  return vi.fn<Call>(async (endpoint) => (endpoint === IdentityContract.tableView ? stored : {}));
}

function savedBodies(call: Mock<Call>): ReadonlyArray<TableViewPreferences | undefined> {
  return call.mock.calls
    .filter(([endpoint]) => endpoint === IdentityContract.saveTableView)
    .map(([, input]) => input.body);
}

describe('account table views', () => {
  it('loads what the account stored the first time a table asks', async () => {
    const { views } = setup(true, holding(COMPACT));
    expect(views.stored('characters')).toStrictEqual({});
    await vi.waitFor(() => {
      expect(views.stored('characters')).toStrictEqual(COMPACT);
    });
  });

  it('shows a change and saves it without a save step', async () => {
    const { views, call } = setup(true, holding({}));
    await views.update('characters', () => COMPACT);
    expect(views.stored('characters')).toStrictEqual(COMPACT);
    expect(call).toHaveBeenCalledWith(IdentityContract.saveTableView, {
      params: { entity: 'characters' },
      body: COMPACT,
    });
  });

  it('applies a change to what the account stored, not to nothing', async () => {
    const { views, call } = setup(true, holding(COMPACT));
    await views.update('characters', (current) => ({ ...current, columns: undefined }));
    expect(savedBodies(call)).toStrictEqual([{ ...COMPACT, columns: undefined }]);
  });

  it('saves in the order the changes were made', async () => {
    const { views, call } = setup(true, holding({}));
    const first = views.update('characters', () => COMPACT);
    const second = views.update('characters', () => ({ density: TableDensity.Comfortable }));
    await Promise.all([first, second]);
    expect(savedBodies(call)).toStrictEqual([COMPACT, { density: TableDensity.Comfortable }]);
  });

  it('keeps saving after one save fails, and reports the failure', async () => {
    const call = holding({});
    const { views, reported } = setup(true, call);
    call.mockImplementationOnce(async () => ({}));
    call.mockRejectedValueOnce(new Error('offline'));
    await views.update('characters', () => COMPACT);
    await views.update('characters', () => ({ density: TableDensity.Comfortable }));
    expect(reported).toHaveBeenCalledTimes(1);
    expect(savedBodies(call)).toStrictEqual([COMPACT, { density: TableDensity.Comfortable }]);
    expect(views.stored('characters')).toStrictEqual({ density: TableDensity.Comfortable });
  });

  it('asks again after a failed load, and reports it', async () => {
    const call = holding(COMPACT);
    const { views, reported } = setup(true, call);
    call.mockRejectedValueOnce(new Error('offline'));
    views.stored('characters');
    await vi.waitFor(() => {
      expect(reported).toHaveBeenCalledTimes(1);
    });
    views.stored('characters');
    await vi.waitFor(() => {
      expect(views.stored('characters')).toStrictEqual(COMPACT);
    });
  });

  it('asks nothing of the server for a signed-out visitor, but still shows the change', async () => {
    const { views, call } = setup(false, holding({}));
    await views.update('characters', () => COMPACT);
    expect(call).not.toHaveBeenCalled();
    expect(views.stored('characters')).toStrictEqual(COMPACT);
  });
});
