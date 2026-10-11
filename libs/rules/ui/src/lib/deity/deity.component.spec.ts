import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { PROPHECIES_OF_KALISTRADE, SARENRAE } from '../testing/deity-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { DeityLine } from './deity-line';
import { DeityView } from './deity.component';

async function render(deity: DeityLine | undefined, loading = false): Promise<ComponentFixture<DeityView>> {
  TestBed.configureTestingModule({
    providers: [provideTanStackQuery(new QueryClient()), provideRulesUiI18nTesting()],
  });
  const fixture = TestBed.createComponent(DeityView);
  fixture.componentRef.setInput('deity', deity);
  fixture.componentRef.setInput('loading', loading);
  await fixture.whenStable();
  return fixture;
}

function host(fixture: ComponentFixture<DeityView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Each term with its values, as read. */
function terms(fixture: ComponentFixture<DeityView>): string[][] {
  return [...host(fixture).querySelectorAll('fr-description-item')].map((item) =>
    [...item.querySelectorAll('fr-text')].map((text) => text.textContent.trim()),
  );
}

describe(DeityView, () => {
  it('lists what the deity grants, each value on its own, then its edicts and anathema', async () => {
    const fixture = await render(SARENRAE);

    expect(terms(fixture)).toStrictEqual([
      ['Heal'],
      ['Can be holy'],
      ['Fire', 'Healing', 'Sun', 'Truth'],
      ['Repose'],
      ['Scimitar'],
      ['Constitution', 'Wisdom'],
      ['Medicine'],
    ]);
    const description = String(host(fixture).querySelector('pio-rich-text')?.textContent);
    expect(description).toContain('Edicts');
    expect(description).toContain('destroy the Spawn of Rovagug');
    expect(description).toContain('create undead, lie');
  });

  it('reads none for what a philosophy lacks', async () => {
    const fixture = await render(PROPHECIES_OF_KALISTRADE);

    expect(terms(fixture).slice(0, 4)).toStrictEqual([['None'], ['None'], ['None'], ['None']]);
  });

  it('says there is no deity', async () => {
    expect(host(await render(undefined)).textContent).toContain('No deity');
  });

  it('shows placeholders while the character loads', async () => {
    expect(host(await render(undefined, true)).querySelectorAll('fr-skeleton')).toHaveLength(2);
  });
});
