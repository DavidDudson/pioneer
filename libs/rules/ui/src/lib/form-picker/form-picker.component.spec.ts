import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FormPicker } from './form-picker.component';
import type { FormPickerOption, FormPreview } from './form-picker.component';

const FORMS: readonly FormPickerOption[] = [{ value: 'animal-form:bear', label: 'Bear' }];
const BEAR: FormPreview = { rows: [{ name: 'Armor Class', own: '19', form: '22' }] };

interface Inputs {
  readonly picked?: string;
  readonly preview?: FormPreview;
  readonly confirm?: () => Promise<void>;
}

interface Rendered {
  readonly host: HTMLElement;
  readonly cancelled: () => number;
}

async function render({ picked, preview, confirm = async () => undefined }: Inputs): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideTanStackQuery(new QueryClient()), provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(FormPicker);
  let cancelled = 0;
  fixture.componentInstance.cancelled.subscribe(() => {
    cancelled += 1;
  });
  fixture.componentRef.setInput('spell', 'Animal Form');
  fixture.componentRef.setInput('options', FORMS);
  fixture.componentRef.setInput('picked', picked);
  fixture.componentRef.setInput('preview', preview);
  fixture.componentRef.setInput('confirm', confirm);
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement, cancelled: () => cancelled };
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

describe(FormPicker, () => {
  it('names the spell being cast', async () => {
    const { host } = await render({});
    expect(textOf(host)).toContain('Cast Animal Form: choose a form');
  });

  it('cannot cast until a form is picked', async () => {
    const { host } = await render({});
    expect(buttonOf(host, 'Cast and transform').disabled).toBe(true);
  });

  it('shows the form value beside the character’s own', async () => {
    const { host } = await render({ picked: 'animal-form:bear', preview: BEAR });
    const text = textOf(host);
    expect(text).toContain('Armor Class');
    expect(text).toContain('22 in the form');
    expect(text).toContain('yours 19');
  });

  it('says when the form changes none of the numbers shown', async () => {
    const { host } = await render({ picked: 'animal-form:bear', preview: { rows: [] } });
    expect(textOf(host)).toContain('This form changes none of the numbers shown here.');
  });

  it('casts when confirmed', async () => {
    const confirm = vi.fn<() => Promise<void>>(async () => undefined);
    const { host } = await render({ picked: 'animal-form:bear', preview: BEAR, confirm });
    buttonOf(host, 'Cast and transform').click();
    await vi.waitFor(() => {
      expect(confirm).toHaveBeenCalledTimes(1);
    });
  });

  it('gives the cast up on Cancel', async () => {
    const { host, cancelled } = await render({ picked: 'animal-form:bear', preview: BEAR });
    buttonOf(host, 'Cancel').click();
    expect(cancelled()).toBe(1);
  });
});
