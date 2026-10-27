import { TestBed } from '@angular/core/testing';
import type { SenseInPlay } from '@pioneer/rules/engine';
import type { ContentId } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { DARKVISION, DWARF_SENSES, FORM_SENSES, SENSE_NAMES } from '../testing/senses-fixtures';
import { SensesView } from './senses.component';

interface Inputs {
  readonly senses: readonly SenseInPlay[] | undefined;
  readonly own?: readonly SenseInPlay[];
  readonly names?: ReadonlyMap<ContentId, string>;
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The panel's rows as read: a row's text and badge joined with " | ", and the disclosure's rows apart. */
async function render({ senses, own, names = SENSE_NAMES }: Inputs): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SensesView);
  fixture.componentRef.setInput('senses', senses);
  fixture.componentRef.setInput('entryNames', names);
  if (own !== undefined) {
    fixture.componentRef.setInput('own', own);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function rowsOf(host: Element): readonly string[] {
  return [...host.querySelectorAll('[role="listitem"]')].map((item) =>
    [...item.querySelectorAll('fr-text, fr-badge')]
      .filter((part) => part.querySelector('fr-text, fr-badge') === null && part.closest('pio-origin-chain') === null)
      .map((part) => textOf(part))
      .join(' | '),
  );
}

describe(SensesView, () => {
  it('shows a skeleton while the senses load', async () => {
    const host = await render({ senses: undefined });

    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(1);
    expect(host.querySelectorAll('[role="listitem"]')).toHaveLength(0);
  });

  it('says so when the character has no special senses', async () => {
    const host = await render({ senses: [] });

    expect(textOf(host)).toBe('No special senses.');
  });

  it('shows a sense as its name and acuity, with the ancestry it comes from', async () => {
    const host = await render({ senses: DWARF_SENSES });

    expect(rowsOf(host)).toStrictEqual(['Darkvision (precise)']);
    expect(textOf(host)).toContain('Dwarf');
  });

  it('shows the range of a sense that has one', async () => {
    const host = await render({ senses: FORM_SENSES });

    expect(rowsOf(host)[0]).toContain('Scent (imprecise, 30 feet)');
  });

  it('marks a sense a battle form gives as from the form, and offers the character’s own', async () => {
    const host = await render({ senses: FORM_SENSES, own: DWARF_SENSES });

    expect(rowsOf(host)).toStrictEqual(['Scent (imprecise, 30 feet) | from Plant Form', 'Darkvision (precise)']);
    expect(textOf(host)).toContain('Your own senses');
  });

  it('offers no own senses while no form replaces them', async () => {
    const host = await render({ senses: DWARF_SENSES });

    expect(textOf(host)).not.toContain('Your own senses');
    expect(rowsOf(host).filter((row) => row.includes('from'))).toStrictEqual([]);
  });

  it('shows the sense’s id without a display name', async () => {
    const host = await render({ senses: DWARF_SENSES, names: new Map() });

    expect(rowsOf(host)[0]).toBe(`${DARKVISION} (precise)`);
  });
});
