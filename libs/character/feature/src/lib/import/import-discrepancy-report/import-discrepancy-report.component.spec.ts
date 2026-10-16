import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { DiscrepancyKind } from '@pioneer/interop/pathbuilder';
import type { DiscrepancyReport } from '@pioneer/interop/pathbuilder';
import { Proficiency, rulesMessages, Selector } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/en.json';
import { ImportDiscrepancyReport } from './import-discrepancy-report.component';

const ARMOR_CLASS = Selector.parse('ac');
const WILL = Selector.parse('save:will');

async function render(report: DiscrepancyReport): Promise<string> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
  TestBed.inject(TranslocoService).setTranslation({ character: en, ...rulesMessages }, 'en', { merge: true });
  const fixture: ComponentFixture<ImportDiscrepancyReport> = TestBed.createComponent(ImportDiscrepancyReport);
  fixture.componentRef.setInput('report', report);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(ImportDiscrepancyReport, () => {
  it('says nothing when nothing could be compared', async () => {
    const text = await render({ compared: 0, differences: [] });

    expect(text.trim()).toBe('');
  });

  it('says every compared statistic matches', async () => {
    const text = await render({ compared: 21, differences: [] });

    expect(text).toContain('All 21 statistics Pathbuilder computed match');
  });

  it('lists a total beside both values and the signed difference', async () => {
    const text = await render({
      compared: 21,
      differences: [
        { kind: DiscrepancyKind.Total, selector: ARMOR_CLASS, pathbuilder: 34, pioneer: 32, difference: -2 },
      ],
    });

    expect(text).toContain('1 statistic differs from Pathbuilder, of 21 compared');
    expect(text).toContain('ac');
    expect(text).toContain('Pathbuilder 34, Pioneer 32');
    expect(text).toContain('-2');
  });

  it('words a rank by its name', async () => {
    const text = await render({
      compared: 21,
      differences: [
        {
          kind: DiscrepancyKind.Rank,
          selector: WILL,
          pathbuilder: Proficiency.Master,
          pioneer: Proficiency.Trained,
          difference: -2,
        },
      ],
    });

    expect(text).toContain('Pathbuilder Master, Pioneer Trained');
  });

  it.each([
    ['defense:heavy', 'Heavy armor'],
    ['defense:unarmored', 'Unarmored defense'],
    ['defense:light', 'Light armor'],
    ['defense:medium', 'Medium armor'],
    ['attack:simple', 'Simple weapons'],
    ['attack:advanced', 'Advanced weapons'],
    ['attack:martial', 'Martial weapons'],
    ['attack:unarmed', 'Unarmed attacks'],
    ['spellcasting', 'Spellcasting'],
  ])('names the ranked statistic %s in words', async (selector, label) => {
    const text = await render({
      compared: 21,
      differences: [
        {
          kind: DiscrepancyKind.Rank,
          selector: Selector.parse(selector),
          pathbuilder: Proficiency.Expert,
          pioneer: Proficiency.Trained,
          difference: -1,
        },
      ],
    });

    expect(text).toContain(label);
    expect(text).not.toContain(selector);
  });

  it('names a spell DC by its entry', async () => {
    const text = await render({
      compared: 21,
      differences: [
        {
          kind: DiscrepancyKind.Total,
          selector: Selector.parse('spell-dc:oracle'),
          pathbuilder: 32,
          pioneer: 31,
          difference: -1,
        },
      ],
    });

    expect(text).toContain('Spell DC (oracle)');
  });
});
