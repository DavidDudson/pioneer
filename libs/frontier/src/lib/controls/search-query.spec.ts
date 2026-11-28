import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { injectSearchQuery, SEARCH_DEBOUNCE } from './search-query';
import type { SearchQuery } from './search-query';

interface Harness {
  readonly current: WritableSignal<string>;
  readonly query: SearchQuery;
  readonly emitted: Array<string>;
}

function setup(): Harness {
  const current = signal('');
  const emitted: Array<string> = [];

  const query = TestBed.runInInjectionContext(() =>
    injectSearchQuery({
      current,
      emit: (value) => {
        emitted.push(value);
      },
    }),
  );

  return { current, query, emitted };
}

/** What a control does on a keystroke: show the text, then ask for a debounced search. */
function type(harness: Harness, text: string): void {
  harness.current.set(text);
  harness.query.type(text);
}

describe(injectSearchQuery, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once typing goes quiet, with the last query', () => {
    const harness = setup();
    type(harness, 'f');
    type(harness, 'fi');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE - 1);

    expect(harness.emitted).toStrictEqual([]);

    vi.advanceTimersByTime(1);

    expect(harness.emitted).toStrictEqual(['fi']);
  });

  it('never repeats the query it last fired', () => {
    const harness = setup();
    type(harness, 'fi');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);
    type(harness, 'fi');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);
    harness.query.now('fi');

    expect(harness.emitted).toStrictEqual(['fi']);
  });

  it('drops a keystroke whose text was replaced meanwhile', () => {
    const harness = setup();
    type(harness, 'fi');
    harness.current.set('picked label');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);

    expect(harness.emitted).toStrictEqual([]);
  });

  it('now fires at once and drops the pending keystroke', () => {
    const harness = setup();
    type(harness, 'fi');
    harness.query.now('fi');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);

    expect(harness.emitted).toStrictEqual(['fi']);
  });

  it('cancel drops the pending keystroke without firing', () => {
    const harness = setup();
    type(harness, 'fi');
    harness.query.cancel();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);

    expect(harness.emitted).toStrictEqual([]);
  });
});
