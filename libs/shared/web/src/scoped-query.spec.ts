import { ApplicationRef, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { injectScopedQuery } from './scoped-query';
import type { ScopedQuery } from './scoped-query';

const MISSING = 'No record selected';

interface Setup {
  readonly id: WritableSignal<string | undefined>;
  readonly allowed: WritableSignal<boolean>;
  readonly fetchRecord: Mock<(id: string) => Promise<string>>;
  readonly scoped: ScopedQuery<string, string>;
}

function setup(): Setup {
  const id = signal<string | undefined>(undefined);
  const allowed = signal(true);
  const fetchRecord = vi.fn<(id: string) => Promise<string>>(async (recordId) => `data of ${recordId}`);
  TestBed.configureTestingModule({ providers: [provideTanStackQuery(new QueryClient())] });

  const scoped = TestBed.runInInjectionContext(() =>
    injectScopedQuery<string, string>({
      id,
      key: (recordId) => ['records', recordId],
      fetch: fetchRecord,
      missingMessage: MISSING,
      enabled: () => allowed(),
    }),
  );

  return { id, allowed, fetchRecord, scoped };
}

async function settle(): Promise<void> {
  // TanStack batches its notifications on a timer.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  TestBed.tick();
  await TestBed.inject(ApplicationRef).whenStable();
  TestBed.tick();
}

describe(injectScopedQuery, () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('reads nothing while no record is open', async () => {
    const { fetchRecord, scoped } = setup();
    await settle();

    expect(fetchRecord).not.toHaveBeenCalled();
    expect(scoped.query.data()).toBeUndefined();
  });

  it('reads the open record', async () => {
    const { id, fetchRecord, scoped } = setup();
    id.set('a');
    await settle();

    expect(fetchRecord).toHaveBeenCalledWith('a');
    expect(scoped.query.data()).toBe('data of a');
  });

  it('waits for the extra gate', async () => {
    const { id, allowed, fetchRecord, scoped } = setup();
    allowed.set(false);
    id.set('a');
    await settle();

    expect(fetchRecord).not.toHaveBeenCalled();

    allowed.set(true);
    await settle();

    expect(scoped.query.data()).toBe('data of a');
  });

  it('gives the open id, and throws when none is open', () => {
    const { id, scoped } = setup();

    expect(() => scoped.openId()).toThrow(MISSING);

    id.set('a');

    expect(scoped.openId()).toBe('a');
  });

  it('replaces the cached data with a value or an updater', async () => {
    const { id, scoped } = setup();
    id.set('a');
    await settle();

    await scoped.replace('a', 'new');
    await settle();

    expect(scoped.query.data()).toBe('new');

    await scoped.replace('a', (shown) => `${String(shown)}!`);
    await settle();

    expect(scoped.query.data()).toBe('new!');
  });

  it('refetches after an invalidation, unless told not to', async () => {
    const { id, fetchRecord, scoped } = setup();
    id.set('a');
    await settle();
    await scoped.invalidate('a', { refetch: false });
    await settle();

    expect(fetchRecord).toHaveBeenCalledTimes(1);

    await scoped.invalidate('a');
    await settle();

    expect(fetchRecord).toHaveBeenCalledTimes(2);
  });

  it('keeps a read that was in flight from overwriting a mutation answer', async () => {
    const { id, fetchRecord, scoped } = setup();
    const staleRead = Promise.withResolvers<string>();
    fetchRecord.mockReturnValueOnce(staleRead.promise);
    id.set('a');
    await settle();

    await scoped.replace('a', 'new');
    staleRead.resolve('stale');
    await settle();

    expect(scoped.query.data()).toBe('new');
  });

  it('reads another record when the open one changes, and leaves the first alone', async () => {
    const { id, fetchRecord, scoped } = setup();
    id.set('a');
    await settle();
    id.set('b');
    await settle();

    expect(fetchRecord).toHaveBeenCalledWith('b');
    expect(scoped.query.data()).toBe('data of b');

    await scoped.replace('a', 'new');
    await settle();

    expect(scoped.query.data()).toBe('data of b');
  });
});
