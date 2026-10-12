import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { DWARF_BUILD, FIGHTER_BUILD, NO_ANCESTRY_BUILD } from '../testing/build-summary-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { BuildLine } from './build-line';
import { BuildSummaryView } from './build-summary.component';

async function render(lines: readonly BuildLine[] | undefined): Promise<ComponentFixture<BuildSummaryView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(BuildSummaryView);
  fixture.componentRef.setInput('lines', lines);
  await fixture.whenStable();
  return fixture;
}

/** Each part as its label and value, or its label and each trait. */
function parts(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('fr-description-item')].map((item) =>
    [...item.querySelectorAll('[role="term"], fr-text, fr-badge')].map((part) => part.textContent.trim()),
  );
}

describe(BuildSummaryView, () => {
  it('names each part, with an attribute and a size by their names and each trait apart', async () => {
    const fixture = await render(FIGHTER_BUILD);
    const host = fixture.nativeElement as HTMLElement;
    expect(parts(host)).toStrictEqual([
      ['Class', 'Fighter'],
      ['Subclass', 'Shield Fighter'],
      ['Ancestry', 'Elf'],
      ['Heritage', 'Whisper Elf'],
      ['Background', 'Guard'],
      ['Deity', 'Iomedae'],
      ['Key attribute', 'Dexterity'],
      ['Size', 'Medium'],
      ['Traits', 'Elf', 'Humanoid'],
    ]);
  });

  it('says what to pick in each empty part', async () => {
    const fixture = await render(DWARF_BUILD);
    const host = fixture.nativeElement as HTMLElement;
    expect(parts(host).map(([, value]) => value)).toStrictEqual([
      'Pick a class',
      'Pick a subclass',
      'Dwarf',
      'Rock Dwarf',
      'Farmhand',
      'Pick a deity',
      'Pick a class and its key attribute',
      'Medium',
      'Dwarf',
    ]);
  });

  it('asks for an ancestry while the character has no traits', async () => {
    const fixture = await render(NO_ANCESTRY_BUILD);
    const host = fixture.nativeElement as HTMLElement;
    expect(parts(host).at(-1)).toStrictEqual(['Traits', 'Pick an ancestry for its traits']);
  });

  it('asks to edit the build from Edit build', async () => {
    const fixture = await render(DWARF_BUILD);
    let edits = 0;
    fixture.componentInstance.edit.subscribe(() => {
      edits += 1;
    });
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    expect(edits).toBe(1);
  });

  it('shows a placeholder per part while loading', async () => {
    const fixture = await render(undefined);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(FIGHTER_BUILD.length);
  });
});
