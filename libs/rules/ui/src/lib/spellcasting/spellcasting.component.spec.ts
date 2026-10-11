import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { CLERIC_SPELLCASTING, MULTICLASS_SPELLCASTING, WIZARD_SPELLCASTING } from '../testing/spellcasting-fixtures';
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

/** The entries' own list items, leaving out those of their statistics and slot lists. */
function entryItems(host: HTMLElement): Element[] {
  return [...host.querySelectorAll('fr-list-item')].filter(
    (item) => item.closest('pio-statistics') === null && item.closest('fr-description-list') === null,
  );
}

function hostOf(fixture: ComponentFixture<SpellcastingView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Each entry's heading texts: tradition, preparation, then where it came from, leaving its statistics and slots out. */
function headings(host: HTMLElement): string[][] {
  return entryItems(host).map((item) =>
    [...(item.querySelector(':scope fr-stack fr-stack')?.querySelectorAll('fr-heading, fr-text, fr-badge') ?? [])].map(
      (part) => textOf(part),
    ),
  );
}

/** A slot list's title, then each row as its term and count. */
function slotList(list: Element): string[] {
  const rows = [...list.querySelectorAll('fr-description-item')].map((row) =>
    [...row.querySelectorAll('[role=term], [role=definition]')].map((part) => textOf(part)).join(' '),
  );
  return [textOf(present(list.previousElementSibling)), ...rows];
}

/** Each entry's slot lists. */
function slotLists(host: HTMLElement): string[][][] {
  return entryItems(host).map((item) =>
    [...item.querySelectorAll('fr-description-list')].map((list) => slotList(list)),
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

  it('lists each entry’s cantrips and slots per rank, then each pool of slots kept apart', async () => {
    const host = hostOf(await render(CLERIC_SPELLCASTING));

    expect(slotLists(host)).toStrictEqual([
      [
        ['Spell slots', 'Cantrips 5', '1st rank 3', '2nd rank 3', '3rd rank 3', '4th rank 2'],
        ['Divine Font slots', '4th rank 5'],
      ],
    ]);
  });

  it('lists a dedication’s cantrips alone, and a pool by what gave it', async () => {
    const host = hostOf(await render(MULTICLASS_SPELLCASTING));

    expect(slotLists(host)).toStrictEqual([
      [['Spell slots', 'Cantrips 2']],
      [
        ['Spell slots', 'Cantrips 5', '1st rank 2'],
        ['School of Battle Magic slots', 'Cantrips 1', '1st rank 1'],
      ],
    ]);
  });

  it('says there is none for a character who casts no spells', async () => {
    expect(hostOf(await render([])).textContent).toContain('No spellcasting.');
  });

  it('shows placeholders while loading', async () => {
    expect(hostOf(await render(undefined)).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
  });
});
