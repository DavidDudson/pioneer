import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import {
  ImportKind,
  Occurrences,
  PathbuilderName,
  RuleBreakingCount,
  UncarriedField,
  UnmatchedReason,
} from '@pioneer/interop/pathbuilder';
import type { CharacterImportReport } from '@pioneer/interop/pathbuilder';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../i18n/en.json';
import { ImportResult } from './import-result.component';

const EMPTY: CharacterImportReport = {
  unmatched: [],
  notCarried: [],
  unplacedBoosts: [],
  skillGaps: [],
  spellGaps: [],
  modifierDifferences: [],
  discrepancies: { compared: 0, differences: [] },
  ruleBreaking: RuleBreakingCount.parse(0),
  ruleBreakingFeats: RuleBreakingCount.parse(0),
  ruleBreakingPicks: RuleBreakingCount.parse(0),
};

async function render(report: CharacterImportReport): Promise<ComponentFixture<ImportResult>> {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideI18n({ en: async () => frontierMessages })] });
  TestBed.inject(TranslocoService).setTranslation({ character: en }, 'en', { merge: true });
  const fixture = TestBed.createComponent(ImportResult);
  fixture.componentRef.setInput('report', report);
  await fixture.whenStable();
  return fixture;
}

function text(fixture: ComponentFixture<ImportResult>): string {
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(ImportResult, () => {
  it('lists what was not kept and each unmatched name with its reason and repeats', async () => {
    const fixture = await render({
      unmatched: [
        {
          kind: ImportKind.Feat,
          names: [
            {
              name: PathbuilderName.parse('Shield Block'),
              occurrences: Occurrences.parse(3),
              reason: UnmatchedReason.Unmatched,
            },
          ],
        },
      ],
      notCarried: [UncarriedField.ClassFeature, UncarriedField.Spell],
      unplacedBoosts: [],
      skillGaps: [],
      spellGaps: [],
      modifierDifferences: [],
      discrepancies: { compared: 0, differences: [] },
      ruleBreaking: RuleBreakingCount.parse(0),
      ruleBreakingFeats: RuleBreakingCount.parse(0),
      ruleBreakingPicks: RuleBreakingCount.parse(0),
    });

    expect(text(fixture)).toContain("weren't kept: Class features and Spells");
    expect(text(fixture)).toContain('Feats · 1 not carried over');
    expect(text(fixture)).toContain('Shield Block');
    expect(text(fixture)).toContain('×3');
    expect(text(fixture)).toContain('Not found');
  });

  it('says a heritage was not offered when it belongs to another ancestry', async () => {
    const fixture = await render({
      ...EMPTY,
      unmatched: [
        {
          kind: ImportKind.Heritage,
          names: [
            {
              name: PathbuilderName.parse('Changeling'),
              occurrences: Occurrences.parse(1),
              reason: UnmatchedReason.NotOffered,
            },
          ],
        },
      ],
    });

    expect(text(fixture)).toContain('Heritage · 1 not carried over');
    expect(text(fixture)).toContain('Changeling');
    expect(text(fixture)).toContain('Not offered');
  });

  it('says everything matched and leaves out the not-kept line when nothing was left behind', async () => {
    const fixture = await render(EMPTY);

    expect(text(fixture)).toContain('Every name matched content you have loaded.');
    expect(text(fixture)).not.toContain("weren't kept");
    expect(text(fixture)).toContain("Every attribute modifier matches Pathbuilder's.");
  });

  it('counts the imported items that break a rule and links to the inventory', async () => {
    const fixture = await render({ ...EMPTY, ruleBreaking: RuleBreakingCount.parse(3) });

    expect(text(fixture)).toContain('3 items were kept as imported but break a rule.');
    expect(text(fixture)).toContain('Review them in the inventory');
  });

  it('counts the imported feats no slot offers, kept and flagged rather than forced into a slot', async () => {
    const fixture = await render({ ...EMPTY, ruleBreakingFeats: RuleBreakingCount.parse(2) });

    expect(text(fixture)).toContain('2 feats fit no slot, so they were kept as imported but break a rule.');
  });

  it('counts the imported heritage and languages no slot holds', async () => {
    const fixture = await render({ ...EMPTY, ruleBreakingPicks: RuleBreakingCount.parse(1) });

    expect(text(fixture)).toContain(
      '1 heritage or language fits no slot, so it was kept as imported but breaks a rule.',
    );
  });

  it('leaves out the rule-breaking line when no imported item breaks a rule', async () => {
    const fixture = await render(EMPTY);

    expect(text(fixture)).not.toContain('break a rule');
  });

  it('emits dismissed when Dismiss is pressed', async () => {
    const fixture = await render(EMPTY);
    const dismissed = vi.fn<() => void>();
    fixture.componentInstance.dismissed.subscribe(() => {
      dismissed();
    });

    const dismiss = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((button) =>
      button.textContent.includes('Dismiss'),
    );
    dismiss?.click();

    expect(dismissed).toHaveBeenCalledTimes(1);
  });
});
