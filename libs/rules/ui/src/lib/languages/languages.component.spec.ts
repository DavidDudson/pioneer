import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { DWARF_LANGUAGES } from '../testing/languages-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { LanguageLine } from './language-line';
import type { RemoveLanguage } from './languages.component';
import { LanguagesView } from './languages.component';

async function render(
  lines: readonly LanguageLine[] | undefined,
  remove: RemoveLanguage = async () => undefined,
): Promise<ComponentFixture<LanguagesView>> {
  TestBed.configureTestingModule({
    providers: [provideTanStackQuery(new QueryClient()), provideRulesUiI18nTesting()],
  });
  const fixture = TestBed.createComponent(LanguagesView);
  fixture.componentRef.setInput('lines', lines);
  fixture.componentRef.setInput('remove', remove);
  await fixture.whenStable();
  return fixture;
}

function host(fixture: ComponentFixture<LanguagesView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Each language's texts: its name, then where it came from. */
function rows(fixture: ComponentFixture<LanguagesView>): string[][] {
  return [...host(fixture).querySelectorAll('fr-list-item')].map((item) =>
    [...item.querySelectorAll('fr-text')].map((text) => text.textContent.trim()),
  );
}

function removeButton(fixture: ComponentFixture<LanguagesView>, language: string): HTMLButtonElement | null {
  return host(fixture).querySelector(`button[aria-label="Remove ${language}"]`);
}

describe(LanguagesView, () => {
  it('lists each language with where it came from, a pick as picked', async () => {
    const fixture = await render(DWARF_LANGUAGES);
    expect(rows(fixture)).toStrictEqual([
      ['Common', 'from Dwarf'],
      ['Dwarven', 'from Dwarf'],
      ['Empyrean', 'from Angelkin'],
      ['Goblin', 'Picked'],
    ]);
  });

  it('removes a pick by its slot; a granted language has no remove', async () => {
    const removed: string[] = [];
    const fixture = await render(DWARF_LANGUAGES, async (slot) => {
      removed.push(slot);
    });

    removeButton(fixture, 'Goblin')?.click();
    await vi.waitFor(() => {
      expect(removed).toHaveLength(1);
    });
    expect(removed).toStrictEqual(['language:1:0']);
    expect(removeButton(fixture, 'Common')).toBeNull();
  });

  it('says there are none before an ancestry is picked', async () => {
    const fixture = await render([]);
    expect(host(fixture).textContent).toContain('No languages yet.');
  });

  it('shows placeholders while loading', async () => {
    const fixture = await render(undefined);
    expect(host(fixture).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
  });
});
