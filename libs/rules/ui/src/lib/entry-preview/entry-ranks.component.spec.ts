import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Select } from '@pioneer/frontier';
import { spellAtRank } from '@pioneer/rules/engine';
import { SpellRank } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { FIREBALL as FIREBALL_DATA } from '../testing/spell-fixtures';
import type { PreviewRanks } from './entry-preview';
import { FIREBALL, modifierPreviewEffect } from './entry-preview.fixtures';
import { EntryRanksView } from './entry-ranks.component';

const FIREBALL_RANKS: PreviewRanks = {
  from: SpellRank.parse(3),
  cast: (rank) => spellAtRank(FIREBALL_DATA, rank),
};

function render(ranks: PreviewRanks): ComponentFixture<EntryRanksView> {
  TestBed.configureTestingModule({ providers: [provideRichTextTesting(), provideRouter([])] });
  const fixture = TestBed.createComponent(EntryRanksView);
  fixture.componentRef.setInput('ranks', ranks);
  fixture.componentRef.setInput('name', 'Fireball');
  fixture.detectChanges();
  return fixture;
}

function textOf(fixture: ComponentFixture<EntryRanksView>): string {
  return (fixture.nativeElement as HTMLElement).textContent;
}

function pick(fixture: ComponentFixture<EntryRanksView>, rank: string): void {
  const select = fixture.debugElement.query(By.directive(Select)).componentInstance as Select<string>;
  select.value.set(rank);
  fixture.detectChanges();
}

describe(EntryRanksView, () => {
  it('starts at the spell’s own rank', () => {
    const fixture = render(FIREBALL_RANKS);
    expect(textOf(fixture)).toContain('3rd rank');
    expect(textOf(fixture)).toContain('6d6');
  });

  it('shows the spell heightened to the rank picked', () => {
    const fixture = render(FIREBALL_RANKS);
    pick(fixture, '5');
    expect(textOf(fixture)).toContain('10d6');
    expect(textOf(fixture)).toContain('5th rank');
  });

  it('ignores a rank below the spell’s own', () => {
    const fixture = render(FIREBALL_RANKS);
    pick(fixture, '1');
    expect(textOf(fixture)).toContain('6d6');
  });

  it('shows what the spell does to the character at the rank picked', () => {
    const ranks: PreviewRanks = {
      ...FIREBALL_RANKS,
      effects: (rank) => [
        modifierPreviewEffect(FIREBALL, { statistic: 'Perception', selector: 'perception', value: rank }),
      ],
    };
    const fixture = render(ranks);
    expect(textOf(fixture)).toContain('Perception +3 status');
    pick(fixture, '6');
    expect(textOf(fixture)).toContain('Perception +6 status');
  });

  it('shows no effects section without a character', () => {
    expect(textOf(render(FIREBALL_RANKS))).not.toContain('Changes for this character');
  });
});
