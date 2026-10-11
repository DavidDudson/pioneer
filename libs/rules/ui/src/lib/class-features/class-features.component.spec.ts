import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CLERIC_FEATURES } from '../testing/class-features-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ClassFeatureLine } from './class-feature-line';
import { ClassFeaturesView } from './class-features.component';

async function render(lines: readonly ClassFeatureLine[] | undefined): Promise<ComponentFixture<ClassFeaturesView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ClassFeaturesView);
  fixture.componentRef.setInput('lines', lines);
  await fixture.whenStable();
  return fixture;
}

/** Each feature's texts: its name, then where it came from. */
function rows(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('fr-list-item')].map((item) =>
    [...item.querySelectorAll('fr-text')].map((text) => text.textContent.trim()),
  );
}

describe(ClassFeaturesView, () => {
  it('lists each feature with the class and level it came from', async () => {
    const fixture = await render(CLERIC_FEATURES.slice(0, 2));
    expect(rows(fixture.nativeElement as HTMLElement)).toStrictEqual([
      ['Cleric Spellcasting', 'from Cleric, level 1'],
      ['Cloistered Cleric', 'from Cleric, level 1'],
    ]);
  });

  it('says there are none before a class is picked', async () => {
    const fixture = await render([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No class features yet.');
  });

  it('shows placeholders while loading', async () => {
    const fixture = await render(undefined);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
  });
});
