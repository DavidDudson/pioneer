import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import {
  ImportKind,
  Occurrences,
  PathbuilderName,
  UncarriedField,
  UnmatchedReason,
} from '@pioneer/interop/pathbuilder';
import type { CharacterImportReport } from '@pioneer/interop/pathbuilder';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../i18n/en.json';
import { ImportResult } from './import-result.component';

async function render(report: CharacterImportReport): Promise<ComponentFixture<ImportResult>> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
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
      notCarried: [UncarriedField.Feat, UncarriedField.Lore],
    });

    expect(text(fixture)).toContain("weren't kept: Feats and Lores");
    expect(text(fixture)).toContain('Feats · 1 not carried over');
    expect(text(fixture)).toContain('Shield Block');
    expect(text(fixture)).toContain('×3');
    expect(text(fixture)).toContain('Not found');
  });

  it('says everything matched and leaves out the not-kept line when nothing was left behind', async () => {
    const fixture = await render({ unmatched: [], notCarried: [] });

    expect(text(fixture)).toContain('Every name matched content you have loaded.');
    expect(text(fixture)).not.toContain("weren't kept");
  });

  it('emits dismissed when Dismiss is pressed', async () => {
    const fixture = await render({ unmatched: [], notCarried: [] });
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
