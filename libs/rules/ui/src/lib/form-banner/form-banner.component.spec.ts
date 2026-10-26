import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FormBanner } from './form-banner.component';
import type { FormSummary } from './form-banner.component';

const PLANT: FormSummary = {
  name: 'Plant Form',
  details: [{ key: 'rules.form.dismiss', params: {} }],
};

interface Rendered {
  readonly host: HTMLElement;
  readonly baseView: () => boolean;
}

async function render(
  form: FormSummary | undefined,
  dismiss: () => Promise<void> = async () => undefined,
  baseView = false,
): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideTanStackQuery(new QueryClient()), provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(FormBanner);
  fixture.componentRef.setInput('form', form);
  fixture.componentRef.setInput('dismiss', dismiss);
  fixture.componentRef.setInput('baseView', baseView);
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement, baseView: () => fixture.componentInstance.baseView() };
}

function textOf(element: Element | null | undefined): string | undefined {
  return element?.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function buttonOf(host: HTMLElement, name: string): HTMLButtonElement {
  const found = [...host.querySelectorAll('button')].find((button) => textOf(button) === name);
  if (found === undefined) {
    throw new Error(`no button ${name}`);
  }
  return found;
}

describe(FormBanner, () => {
  it('is empty when the character is in no form', async () => {
    const { host } = await render(undefined);
    expect(textOf(host)).toBe('');
  });

  it('names the form in words', async () => {
    const { host } = await render(PLANT);
    expect(textOf(host)).toContain('In form: Plant Form');
  });

  it('does not mark the sheet as a reference view until the base sheet is shown', async () => {
    const { host } = await render(PLANT);
    expect(textOf(host)).not.toContain('for reference only');
  });

  it('marks the base sheet as a reference view that leaves the form active', async () => {
    const { host } = await render(PLANT, undefined, true);
    expect(textOf(host)).toContain('Base sheet, for reference only. The form is still active.');
  });

  it('flips the base view with the toggle, and does not dismiss the form', async () => {
    const dismiss = vi.fn<() => Promise<void>>(async () => undefined);
    const { host, baseView } = await render(PLANT, dismiss);

    buttonOf(host, 'Show base sheet').click();

    expect(baseView()).toBe(true);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('dismisses the form', async () => {
    const dismiss = vi.fn<() => Promise<void>>(async () => undefined);
    const { host } = await render(PLANT, dismiss);

    buttonOf(host, 'Dismiss').click();

    await vi.waitFor(() => {
      expect(dismiss).toHaveBeenCalledTimes(1);
    });
  });
});
