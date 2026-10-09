import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE } from '../../controls/search-input/search-input.component';
import type { SelectOption } from '../../controls/select/select.component';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { ComboboxField } from './combobox-field.component';

const SPELLS: readonly SelectOption<string>[] = [{ value: 'heal', label: 'Heal' }];

function render(): ComponentFixture<ComboboxField<string>> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(ComboboxField<string>);
  fixture.componentRef.setInput('label', 'Spell');
  fixture.componentRef.setInput('options', SPELLS);
  fixture.detectChanges();
  return fixture;
}

function input(fixture: ComponentFixture<ComboboxField<string>>): HTMLInputElement {
  const found = (fixture.nativeElement as HTMLElement).querySelector('input');
  if (found === null) {
    throw new Error('Expected an input');
  }
  return found;
}

async function open(fixture: ComponentFixture<ComboboxField<string>>): Promise<HTMLElement | null> {
  input(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector('[role="listbox"]');
}

describe(ComboboxField, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('names the combobox and its listbox with the field label', async () => {
    const fixture = render();
    const label = (fixture.nativeElement as HTMLElement).querySelector('label');
    expect(label?.textContent.trim()).toBe('Spell');
    expect(label?.getAttribute('for')).toBe(input(fixture).id);
    const listbox = await open(fixture);
    expect(listbox?.getAttribute('aria-labelledby')).toBe(label?.id);
  });

  it('passes the typed query out', () => {
    vi.useFakeTimers();
    const fixture = render();
    const searches: string[] = [];
    fixture.componentInstance.searched.subscribe((query) => {
      searches.push(query);
    });
    input(fixture).value = 'He';
    input(fixture).dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    fixture.detectChanges();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);
    expect(searches).toStrictEqual(['He']);
  });

  it('passes loading through to a busy listbox', async () => {
    const fixture = render();
    fixture.componentRef.setInput('loading', true);
    const listbox = await open(fixture);
    expect(listbox?.getAttribute('aria-busy')).toBe('true');
  });
});
