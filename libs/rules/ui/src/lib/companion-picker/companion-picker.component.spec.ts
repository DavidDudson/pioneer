import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { CompanionPicker } from './companion-picker.component';
import type { CompanionPick, CompanionSpeciesOption } from './companion-picker.component';

const SPECIES: ReadonlyArray<CompanionSpeciesOption> = [
  { value: 'companion:bear', label: 'Bear' },
  { value: 'companion:wolf', label: 'Wolf' },
];

interface Inputs {
  readonly picked?: string;
  readonly name?: string;
}

interface Rendered {
  readonly host: HTMLElement;
  readonly confirmed: () => ReadonlyArray<CompanionPick>;
  readonly cancelled: () => number;
}

async function render({ picked, name = '' }: Inputs): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideTanStackQuery(new QueryClient()), provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(CompanionPicker);
  const confirmed: Array<CompanionPick> = [];
  let cancelled = 0;
  fixture.componentInstance.confirmed.subscribe((pick) => {
    confirmed.push(pick);
  });
  fixture.componentInstance.cancelled.subscribe(() => {
    cancelled += 1;
  });
  fixture.componentRef.setInput('source', 'Animal Companion');
  fixture.componentRef.setInput('options', SPECIES);
  fixture.componentRef.setInput('picked', picked);
  fixture.componentRef.setInput('name', name);
  await fixture.whenStable();

  // SAFETY: a component fixture's native element is the host HTMLElement.
  return { host: fixture.nativeElement as HTMLElement, confirmed: () => confirmed, cancelled: () => cancelled };
}

function textOf(element: Element | null | undefined): string | undefined {
  return element?.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function buttonOf(host: HTMLElement, label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll('button')].find((button) => textOf(button) === label);

  if (found === undefined) {
    throw new Error(`no button ${label}`);
  }

  return found;
}

describe(CompanionPicker, () => {
  it('names the feature that grants the companion', async () => {
    const { host } = await render({});
    expect(textOf(host)).toContain('Animal Companion: choose a companion');
  });

  it('has a name field', async () => {
    const { host } = await render({});
    expect(host.querySelector('input[aria-label="Name"]')).not.toBeNull();
  });

  it('cannot be confirmed without a species', async () => {
    const { host } = await render({ name: 'Ash' });
    expect(buttonOf(host, 'Choose companion').disabled).toBe(true);
  });

  it('cannot be confirmed with a blank name', async () => {
    const { host } = await render({ picked: 'companion:bear', name: '   ' });
    expect(buttonOf(host, 'Choose companion').disabled).toBe(true);
  });

  it('raises the species and the trimmed name when confirmed', async () => {
    const { host, confirmed } = await render({ picked: 'companion:wolf', name: ' Ash ' });
    buttonOf(host, 'Choose companion').click();
    expect(confirmed()).toStrictEqual([{ species: 'companion:wolf', name: 'Ash' }]);
  });

  it('gives the choice up on Cancel', async () => {
    const { host, cancelled } = await render({});
    buttonOf(host, 'Cancel').click();
    expect(cancelled()).toBe(1);
  });
});
