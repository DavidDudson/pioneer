import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { ImportKind, MatchStatus, Occurrences, PathbuilderName } from '@pioneer/interop/pathbuilder';
import type { ReportGroup } from '@pioneer/interop/pathbuilder';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/en.json';
import { ImportReportGroup } from './import-report-group.component';

const group: ReportGroup = {
  kind: ImportKind.ClassFeature,
  rows: [
    {
      kind: ImportKind.ClassFeature,
      name: PathbuilderName.parse('Nature'),
      occurrences: Occurrences.parse(2),
      status: MatchStatus.KindNotLoaded,
      match: undefined,
    },
    {
      kind: ImportKind.ClassFeature,
      name: PathbuilderName.parse('Wild Willpower'),
      occurrences: Occurrences.parse(1),
      status: MatchStatus.Unmatched,
      match: undefined,
    },
  ],
};

describe(ImportReportGroup, () => {
  it('summarises the kind and lists each name with its status and repeats', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
    TestBed.inject(TranslocoService).setTranslation({ character: en }, 'en', { merge: true });
    const fixture = TestBed.createComponent(ImportReportGroup);
    fixture.componentRef.setInput('group', group);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Class features · 0 of 2 matched');
    expect(text).toContain('Nature');
    expect(text).toContain('×2');
    expect(text).toContain('Not loaded yet');
    expect(text).toContain('Not found');
  });
});
