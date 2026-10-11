import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { BoostSource } from '@pioneer/character/domain';
import { frontierMessages } from '@pioneer/frontier';
import type { ModifierDifference, UnplacedBoost } from '@pioneer/interop/pathbuilder';
import { Attribute, AttributeModifier, Level, rulesMessages } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/en.json';
import { ImportBoostReport } from './import-boost-report.component';

const WISDOM_OFF: ModifierDifference = {
  attribute: Attribute.Wisdom,
  imported: AttributeModifier.parse(5),
  derived: AttributeModifier.parse(4),
};
const CHARISMA_AT_FIVE: UnplacedBoost = {
  source: BoostSource.Free,
  level: Level.parse(5),
  attribute: Attribute.Charisma,
};

async function render(
  modifierDifferences: readonly ModifierDifference[],
  unplacedBoosts: readonly UnplacedBoost[],
): Promise<string> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
  TestBed.inject(TranslocoService).setTranslation({ character: en, ...rulesMessages }, 'en', { merge: true });
  const fixture: ComponentFixture<ImportBoostReport> = TestBed.createComponent(ImportBoostReport);
  fixture.componentRef.setInput('modifierDifferences', modifierDifferences);
  fixture.componentRef.setInput('unplacedBoosts', unplacedBoosts);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(ImportBoostReport, () => {
  it("says the modifiers match Pathbuilder's and lists no boosts when every boost found a slot", async () => {
    const text = await render([], []);

    expect(text).toContain("Every attribute modifier matches Pathbuilder's.");
    expect(text).not.toContain('found no slot');
  });

  it('lists each modifier that differs, both signed', async () => {
    const text = await render([WISDOM_OFF], []);

    expect(text).toContain('1 attribute differs from Pathbuilder');
    expect(text).toContain('Wisdom');
    expect(text).toContain('Pathbuilder +5, Pioneer +4');
    expect(text).not.toContain('matches Pathbuilder');
  });

  it('lists each boost no slot took, by its set and the attribute Pathbuilder gave it', async () => {
    const text = await render([], [CHARISMA_AT_FIVE]);

    expect(text).toContain('1 boost found no slot');
    expect(text).toContain('Level 5 boost');
    expect(text).toContain('Charisma');
  });
});
