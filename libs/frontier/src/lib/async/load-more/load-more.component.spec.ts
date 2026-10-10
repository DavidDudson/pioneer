import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeInfiniteQuery } from '../../testing/fake-infinite-query';
import { LoadMoreHost } from '../../testing/load-more-host';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { LoadMore } from './load-more.component';

const FIRST = ['Valeros', 'Seoni'] as const;
const SECOND = ['Kyra', 'Merisiel'] as const;

interface Rendered {
  readonly fixture: ComponentFixture<LoadMoreHost>;
  readonly query: FakeInfiniteQuery<string>;
  readonly host: HTMLElement;
}

async function render(inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  const fixture = TestBed.createComponent(LoadMoreHost);
  const query = new FakeInfiniteQuery<string>(FIRST);
  fixture.componentRef.setInput('query', query);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await settle();
  const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('fr-load-more');
  if (host === null) {
    throw new Error('Expected an fr-load-more');
  }
  return { fixture, query, host };
}

/** Let the action and timers run, then render (TanStack updates its signals from root effects). */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  TestBed.tick();
}

function button(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector('button');
}

function press(host: HTMLElement): void {
  const element = button(host);
  if (element === null) {
    throw new Error('Expected a load-more button');
  }
  element.click();
}

function items(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('fr-list-item')];
}

function names(host: HTMLElement): string[] {
  return items(host).map((item) => item.textContent.trim());
}

describe(LoadMore, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideTanStackQuery(new QueryClient()), ...provideFrontierI18nTesting()],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the list and a load-more button while there are more pages', async () => {
    const { host } = await render();
    expect(names(host)).toStrictEqual([...FIRST]);
    expect(button(host)?.textContent.trim()).toBe('Load more');
    expect(host.querySelector('fr-skeleton')).toBeNull();
    expect(host.hasAttribute('aria-busy')).toBe(false);
  });

  it('takes a custom label', async () => {
    const { host } = await render({ label: 'More spells' });
    expect(button(host)?.textContent.trim()).toBe('More spells');
  });

  it('fetches the next page on press, with skeleton rows after the list and a busy button meanwhile', async () => {
    const { host, query } = await render();
    press(host);
    await settle();
    expect(query.fetches()).toBe(1);
    expect(host.querySelector('fr-skeleton')).not.toBeNull();
    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(button(host)?.getAttribute('aria-busy')).toBe('true');
    expect(names(host)).toStrictEqual([...FIRST]);
  });

  it('ignores a second press while the page loads', async () => {
    const { host, query } = await render();
    press(host);
    await settle();
    press(host);
    await settle();
    expect(query.fetches()).toBe(1);
  });

  it('adds the page in place', async () => {
    const { host, query } = await render();
    press(host);
    await settle();
    query.land(SECOND);
    await settle();
    expect(names(host)).toStrictEqual([...FIRST, ...SECOND]);
    expect(host.querySelector('fr-skeleton')).toBeNull();
    expect(host.hasAttribute('aria-busy')).toBe(false);
  });

  it('moves focus to the first item of the new page', async () => {
    const { host, query } = await render();
    press(host);
    await settle();
    query.land(SECOND);
    await settle();
    expect(document.activeElement).toBe(items(host)[FIRST.length]);
  });

  it('leaves new items out of the tab order', async () => {
    const { host } = await render();
    expect(items(host).map((item) => item.getAttribute('tabindex'))).toStrictEqual(['-1', '-1']);
  });

  it('drops the button after the last page', async () => {
    const { host, query } = await render();
    press(host);
    await settle();
    query.land(SECOND, true);
    await settle();
    expect(button(host)).toBeNull();
    expect(document.activeElement).toBe(items(host)[FIRST.length]);
  });

  it('shows a failure inline under the button and keeps the list and focus', async () => {
    const { host, query } = await render();
    button(host)?.focus();
    press(host);
    await settle();
    query.fail(new Error('500'));
    await settle();
    expect(host.querySelector('fr-message')?.textContent.trim()).toBe('Could not load more. Try again.');
    expect(host.querySelector('fr-skeleton')).toBeNull();
    expect(names(host)).toStrictEqual([...FIRST]);
    expect(document.activeElement).toBe(button(host));
  });

  it('clears the failure once a retry loads the page', async () => {
    const { host, query } = await render();
    press(host);
    await settle();
    query.fail(new Error('500'));
    await settle();
    press(host);
    await settle();
    query.land(SECOND);
    await settle();
    expect(host.querySelector('fr-message')).toBeNull();
    expect(names(host)).toStrictEqual([...FIRST, ...SECOND]);
  });

  it('shows the given error message instead of the generic one', async () => {
    const { host, query } = await render({ errorMessage: 'Could not load more spells.' });
    press(host);
    await settle();
    query.fail(new Error('500'));
    await settle();
    expect(host.querySelector('fr-message')?.textContent.trim()).toBe('Could not load more spells.');
  });
});
