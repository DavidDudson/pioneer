import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { SelectOption } from '../../controls/select/select.component';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { ComboboxField } from './combobox-field.component';

const SPELLS: readonly SelectOption<string>[] = [{ value: 'heal', label: 'Heal' }];

describe(ComboboxField, () => {
  it('names the combobox and its listbox with the field label', async () => {
    TestBed.configureTestingModule({
      providers: [...provideFrontierI18nTesting()],
    });
    const fixture = TestBed.createComponent(ComboboxField<string>);
    fixture.componentRef.setInput('label', 'Spell');
    fixture.componentRef.setInput('options', SPELLS);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector('input');
    const label = host.querySelector('label');
    expect(label?.textContent.trim()).toBe('Spell');
    expect(label?.getAttribute('for')).toBe(input?.id);

    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('[role="listbox"]')?.getAttribute('aria-labelledby')).toBe(label?.id);
  });
});
