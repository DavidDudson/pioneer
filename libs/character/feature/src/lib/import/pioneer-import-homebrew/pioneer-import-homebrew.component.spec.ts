import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { HomebrewEntryOutcome, HomebrewPackStatus } from '@pioneer/interop/pioneer';
import type { HomebrewPackReport } from '@pioneer/interop/pioneer';
import { ContentText, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/en.json';
import { PioneerImportHomebrew } from './pioneer-import-homebrew.component';

function pack(status: HomebrewPackStatus, outcomes: readonly HomebrewEntryOutcome[]): HomebrewPackReport {
  return {
    pack: PackId.parse('moon-brew'),
    title: ContentText.parse('Moon brew'),
    publisher: ContentText.parse('Amiri'),
    status,
    entries: outcomes.map((outcome, index) => ({
      slug: EntrySlug.parse(`feat:entry-${index}`),
      name: ContentText.parse(`Entry ${index}`),
      outcome,
    })),
  };
}

async function render(packs: readonly HomebrewPackReport[]): Promise<string> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
  TestBed.inject(TranslocoService).setTranslation({ character: en }, 'en', { merge: true });
  const fixture = TestBed.createComponent(PioneerImportHomebrew);
  fixture.componentRef.setInput('packs', packs);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(PioneerImportHomebrew, () => {
  it('names the pack with its author and what importing does to it', async () => {
    const text = await render([pack(HomebrewPackStatus.New, [HomebrewEntryOutcome.Create])]);

    expect(text).toContain('Moon brew by Amiri (moon-brew)');
    expect(text).toContain('A new pack, private to you, is made for it.');
  });

  it('says what happens to each entry', async () => {
    const text = await render([
      pack(HomebrewPackStatus.Own, [HomebrewEntryOutcome.Create, HomebrewEntryOutcome.Reuse]),
    ]);

    expect(text).toContain('Entry 0 · added');
    expect(text).toContain('Entry 1 · already here, reused');
  });

  it('counts the clashes and says they are kept as they are', async () => {
    const text = await render([
      pack(HomebrewPackStatus.Taken, [HomebrewEntryOutcome.Clash, HomebrewEntryOutcome.Clash]),
    ]);

    expect(text).toContain('2 entries clash with a different entry already here');
    expect(text).toContain('Entry 0 · clashes, not imported');
  });

  it('shows no clash warning when nothing clashes', async () => {
    const text = await render([pack(HomebrewPackStatus.Own, [HomebrewEntryOutcome.Reuse])]);

    expect(text).not.toContain('clash');
  });
});
