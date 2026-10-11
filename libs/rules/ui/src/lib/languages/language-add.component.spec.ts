import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { DWARF_LANGUAGE_OPTIONS } from '../testing/languages-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { AddLanguage } from './language-add.component';
import { LanguageAdd } from './language-add.component';

async function render(open: number, add: AddLanguage = async () => undefined): Promise<ComponentFixture<LanguageAdd>> {
  TestBed.configureTestingModule({
    providers: [provideTanStackQuery(new QueryClient()), provideRulesUiI18nTesting()],
  });
  const fixture = TestBed.createComponent(LanguageAdd);
  fixture.componentRef.setInput('options', DWARF_LANGUAGE_OPTIONS);
  fixture.componentRef.setInput('open', open);
  fixture.componentRef.setInput('add', add);
  document.body.append(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  return fixture;
}

function host(fixture: ComponentFixture<LanguageAdd>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function addButton(fixture: ComponentFixture<LanguageAdd>): HTMLButtonElement | undefined {
  return [...host(fixture).querySelectorAll('button')].find((each) => each.textContent.trim() === 'Add language');
}

function selectTrigger(fixture: ComponentFixture<LanguageAdd>): HTMLElement | null {
  return host(fixture).querySelector<HTMLElement>('fr-select button');
}

async function choose(fixture: ComponentFixture<LanguageAdd>, label: string): Promise<void> {
  selectTrigger(fixture)?.click();
  await fixture.whenStable();
  const option = await vi.waitFor(() => {
    const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (each) => each.textContent.trim() === label,
    );
    expect(found).toBeDefined();
    return found;
  });
  option?.click();
  await fixture.whenStable();
}

describe(LanguageAdd, () => {
  it('shows nothing when no languages are left to add', async () => {
    const fixture = await render(0);
    expect(addButton(fixture)).toBeUndefined();
  });

  it('says how many are left, and shows the picker in place, focused, when Add language is pressed', async () => {
    const fixture = await render(2);
    expect(host(fixture).textContent).toContain('2 languages left to add');

    addButton(fixture)?.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(selectTrigger(fixture));
    expect(addButton(fixture)).toBeUndefined();
  });

  it('adds the picked language, then closes and says so', async () => {
    const add = vi.fn<AddLanguage>(async () => undefined);
    const fixture = await render(1, add);
    const added = vi.fn<() => void>();
    fixture.componentInstance.added.subscribe(() => {
      added();
    });
    addButton(fixture)?.click();
    await fixture.whenStable();

    await choose(fixture, 'Elven');
    await vi.waitFor(() => {
      expect(added).toHaveBeenCalledTimes(1);
    });
    expect(add).toHaveBeenCalledWith('elven');
    expect(selectTrigger(fixture)).toBeNull();
  });

  it('keeps the picker open with the failure beside it when saving fails', async () => {
    const fixture = await render(1, async () => {
      throw new Error('offline');
    });
    addButton(fixture)?.click();
    await fixture.whenStable();

    await choose(fixture, 'Elven');
    await vi.waitFor(() => {
      expect(host(fixture).querySelector('fr-message')).not.toBeNull();
    });
    expect(selectTrigger(fixture)).not.toBeNull();
  });

  it('closes on Escape and returns focus to Add language', async () => {
    const fixture = await render(1);
    addButton(fixture)?.click();
    await fixture.whenStable();

    selectTrigger(fixture)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(addButton(fixture));
  });
});
