import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { PathbuilderName } from '@pioneer/interop/pathbuilder';
import type { SkillGap } from '@pioneer/interop/pathbuilder';
import { Proficiency, rulesMessages } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/en.json';
import { ImportSkillReport } from './import-skill-report.component';

const NATURE: SkillGap = {
  name: PathbuilderName.parse('Nature'),
  wanted: Proficiency.Master,
  reached: Proficiency.Expert,
};
const ENCHANTMENT: SkillGap = {
  name: PathbuilderName.parse('Enchantment'),
  wanted: Proficiency.Trained,
  reached: undefined,
};

async function render(skillGaps: readonly SkillGap[]): Promise<string> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
  TestBed.inject(TranslocoService).setTranslation({ character: en, ...rulesMessages }, 'en', { merge: true });
  const fixture: ComponentFixture<ImportSkillReport> = TestBed.createComponent(ImportSkillReport);
  fixture.componentRef.setInput('skillGaps', skillGaps);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(ImportSkillReport, () => {
  it('says nothing when every rank was reached', async () => {
    const text = await render([]);

    expect(text.trim()).toBe('');
  });

  it('lists each skill with the rank Pathbuilder gave it and the rank the slots reached', async () => {
    const text = await render([NATURE, ENCHANTMENT]);

    expect(text).toContain('2 skills fell short of Pathbuilder');
    expect(text).toContain('Nature');
    expect(text).toContain('Pathbuilder Master, Pioneer Expert');
    expect(text).toContain('Pathbuilder Trained, Pioneer Untrained');
  });
});
