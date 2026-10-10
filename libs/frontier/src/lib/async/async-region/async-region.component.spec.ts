import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AsyncRegionHost } from '../../testing/async-region-host';
import { FakeQuery } from '../../testing/fake-query';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { AsyncRegion } from './async-region.component';

const PARTY = ['Valeros', 'Seoni', 'Kyra'] as const;

interface Rendered {
  readonly fixture: ComponentFixture<AsyncRegionHost>;
  readonly query: FakeQuery<readonly string[]>;
  readonly region: HTMLElement;
  readonly stable: () => Promise<void>;
}

async function render(inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  const fixture = TestBed.createComponent(AsyncRegionHost);
  const query = new FakeQuery<readonly string[]>();
  fixture.componentRef.setInput('query', query);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const region = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('fr-async-region');
  if (region === null) {
    throw new Error('Expected an fr-async-region');
  }
  return {
    fixture,
    query,
    region,
    stable: async (): Promise<void> => {
      await fixture.whenStable();
    },
  };
}

function names(region: HTMLElement): string[] {
  return [...region.querySelectorAll('fr-text')].map((text) => text.textContent.trim());
}

function message(region: HTMLElement): HTMLElement | null {
  return region.querySelector('fr-message');
}

describe(AsyncRegion, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('shows only the pending slot, and is busy, while the query loads', async () => {
    const { region } = await render();
    expect(region.querySelector('fr-skeleton')).not.toBeNull();
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(names(region)).toStrictEqual([]);
    expect(message(region)).toBeNull();
  });

  it('swaps the skeleton for the data slot, given the data, once loaded', async () => {
    const { query, region, stable } = await render();
    query.succeed(PARTY);
    await stable();
    expect(names(region)).toStrictEqual([...PARTY]);
    expect(region.querySelector('fr-skeleton')).toBeNull();
    expect(region.hasAttribute('aria-busy')).toBe(false);
  });

  it('renders the data slot for loaded but empty data', async () => {
    const { query, region, stable } = await render();
    query.succeed([]);
    await stable();
    expect(region.querySelector('fr-stack')).not.toBeNull();
    expect(region.querySelector('fr-skeleton')).toBeNull();
    expect(message(region)).toBeNull();
  });

  it('follows new data', async () => {
    const { query, region, stable } = await render();
    query.succeed(PARTY);
    await stable();
    query.succeed(['Merisiel']);
    await stable();
    expect(names(region)).toStrictEqual(['Merisiel']);
  });

  it('shows the generic failure inline as an alert when the query fails', async () => {
    const { query, region, stable } = await render();
    query.fail(new Error('500'));
    await stable();
    expect(message(region)?.textContent.trim()).toBe('Could not load this. Try again later.');
    expect(region.querySelector('[role="alert"]')).not.toBeNull();
    expect(region.querySelector('fr-skeleton')).toBeNull();
    expect(region.hasAttribute('aria-busy')).toBe(false);
  });

  it('shows the given error message instead of the generic one', async () => {
    const { query, region, stable } = await render({ errorMessage: 'Could not load the party.' });
    query.fail(new Error('500'));
    await stable();
    expect(message(region)?.textContent.trim()).toBe('Could not load the party.');
  });

  it('renders the error slot, given the error, in place of the message', async () => {
    const { query, region, stable } = await render({ customError: true, errorMessage: 'Unused' });
    query.fail(new Error('Party not found'));
    await stable();
    expect(message(region)).toBeNull();
    expect(names(region)).toStrictEqual(['Party not found']);
  });

  it('shows the failure over earlier data when a later fetch fails', async () => {
    const { query, region, stable } = await render();
    query.succeed(PARTY);
    await stable();
    query.fail(new Error('500'));
    await stable();
    expect(message(region)).not.toBeNull();
    expect(names(region)).toStrictEqual([]);
  });

  it('drops the failure once a retry succeeds', async () => {
    const { query, region, stable } = await render();
    query.fail(new Error('500'));
    await stable();
    query.succeed(PARTY);
    await stable();
    expect(message(region)).toBeNull();
    expect(names(region)).toStrictEqual([...PARTY]);
  });
});
