import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { PathbuilderName, SpellGapReason } from '@pioneer/interop/pathbuilder';
import type { SpellGap } from '@pioneer/interop/pathbuilder';
import { rulesMessages, SlotRank } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/en.json';
import { ImportSpellReport } from './import-spell-report.component';

const ORACLE = PathbuilderName.parse('Oracle');
const FATED_HEALING: SpellGap = {
  caster: ORACLE,
  rank: 1,
  name: PathbuilderName.parse('Fated Healing'),
  reason: SpellGapReason.NotOffered,
};
const SHIELD: SpellGap = {
  caster: ORACLE,
  rank: SlotRank.Cantrip,
  name: PathbuilderName.parse('Shield'),
  reason: SpellGapReason.NoSlot,
};
const FIGMENT: SpellGap = {
  caster: PathbuilderName.parse('Archetype Sorcerer'),
  rank: SlotRank.Cantrip,
  name: PathbuilderName.parse('Figment'),
  reason: SpellGapReason.NoEntry,
};

const GROWN_OF_OAK: SpellGap = {
  caster: PathbuilderName.parse('Grown of Oak'),
  rank: 2,
  name: PathbuilderName.parse('Oaken Resilience'),
  reason: SpellGapReason.NotGranted,
};

async function render(spellGaps: readonly SpellGap[]): Promise<string> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
  TestBed.inject(TranslocoService).setTranslation({ character: en, ...rulesMessages }, 'en', { merge: true });
  const fixture: ComponentFixture<ImportSpellReport> = TestBed.createComponent(ImportSpellReport);
  fixture.componentRef.setInput('spellGaps', spellGaps);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(ImportSpellReport, () => {
  it('says nothing when every spell found a slot', async () => {
    const text = await render([]);

    expect(text.trim()).toBe('');
  });

  it('lists each spell with its caster and its rank', async () => {
    const text = await render([FATED_HEALING, SHIELD, FIGMENT]);

    expect(text).toContain('3 spells found no slot');
    expect(text).toContain('Fated Healing (Oracle, rank 1)');
    expect(text).toContain('Shield (Oracle, cantrip)');
    expect(text).toContain('Figment (Archetype Sorcerer, cantrip)');
  });

  it('says why each spell found no slot', async () => {
    const text = await render([FATED_HEALING, SHIELD, FIGMENT, GROWN_OF_OAK]);

    expect(text).toContain('No slot offers it');
    expect(text).toContain('Every slot of its rank is taken');
    expect(text).toContain('No spellcasting to put it in');
    expect(text).toContain('Its feat does not grant it');
  });
});
