import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { MULTICLASS_SPELLCASTING, WIZARD_SPELLCASTING } from '../testing/spellcasting-fixtures';
import type { SpellcastingEntryLine } from './spellcasting-entry-line';
import { SpellcastingView } from './spellcasting.component';

async function render(
  entries: readonly SpellcastingEntryLine[] | undefined,
): Promise<ComponentFixture<SpellcastingView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SpellcastingView);
  fixture.componentRef.setInput('entries', entries);
  await fixture.whenStable();
  return fixture;
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function hostOf(fixture: ComponentFixture<SpellcastingView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Each entry's heading texts: tradition, preparation, then where it came from, leaving its statistics out. */
function headings(host: HTMLElement): string[][] {
  const entries = [...host.querySelectorAll('fr-list-item')].filter((item) => item.closest('pio-statistics') === null);
  return entries.map((item) =>
    [...item.querySelectorAll('fr-text, fr-badge')]
      .filter((part) => part.closest('pio-statistics') === null)
      .map((part) => textOf(part)),
  );
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** Each entry's statistics as their summaries read. */
function statistics(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('pio-statistics')].map((list) =>
    [...list.querySelectorAll('summary')].map((summary) => textOf(summary)),
  );
}

describe(SpellcastingView, () => {
  it('names each entry by tradition and how it casts, with where it came from', async () => {
    const host = hostOf(await render(MULTICLASS_SPELLCASTING));

    expect(headings(host)).toStrictEqual([
      ['Occult', 'Spontaneous', 'from Bard Dedication'],
      ['Arcane', 'Prepared', 'from Wizard Spellcasting'],
    ]);
  });

  it('lists each entry’s spell attack signed and its spell DC plain', async () => {
    const host = hostOf(await render(WIZARD_SPELLCASTING));

    expect(statistics(host)).toStrictEqual([['Spell attack +7', 'Spell DC 17']]);
  });

  it('expands a spell DC to its breakdown, built on the entry’s spell attack', async () => {
    const fixture = await render(WIZARD_SPELLCASTING);
    const [, found] = hostOf(fixture).querySelectorAll('details');
    const dc = present(found);

    present(dc.querySelector('summary')).click();
    await fixture.whenStable();

    const breakdown = present(dc.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('@stat.spell-attack');
  });

  it('says there is none for a character who casts no spells', async () => {
    expect(hostOf(await render([])).textContent).toContain('No spellcasting.');
  });

  it('shows placeholders while loading', async () => {
    expect(hostOf(await render(undefined)).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
  });
});
