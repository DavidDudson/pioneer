import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ContentId, FundamentalRune } from '@pioneer/rules/sdk';
import { runicPair } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { RuneBadgeKind } from './rune-badge-data';
import type { RuneBadgeData } from './rune-badge-data';
import { RuneBadge } from './rune-badge.component';
import { FUNDAMENTAL_GLYPHS } from './rune-glyphs';

const FLAMING = ContentId.parse('00000000-0000-4000-8000-000000000001');

async function render(rune: RuneBadgeData): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<RuneBadge> = TestBed.createComponent(RuneBadge);
  fixture.componentRef.setInput('rune', rune);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function glyphsOf(host: HTMLElement): string {
  return (host.querySelector('[aria-hidden="true"]')?.textContent ?? '').replaceAll(/\s/gu, '');
}

describe(RuneBadge, () => {
  it('shows a fundamental rune’s glyph in its grade’s colour, and names the grade', async () => {
    const host = await render({ kind: RuneBadgeKind.Fundamental, rune: FundamentalRune.Striking, grade: 2 });

    expect(glyphsOf(host)).toBe(FUNDAMENTAL_GLYPHS[FundamentalRune.Striking]);
    expect(host.querySelector('.sr-only')?.textContent).toBe('Greater Striking');
    expect(host.querySelector('.bg-rune-greater')).not.toBeNull();
  });

  it('shows the same glyph at the lowest grade, in the base colour', async () => {
    const host = await render({ kind: RuneBadgeKind.Fundamental, rune: FundamentalRune.Striking, grade: 1 });

    expect(glyphsOf(host)).toBe(FUNDAMENTAL_GLYPHS[FundamentalRune.Striking]);
    expect(host.querySelector('.bg-rune-base')).not.toBeNull();
  });

  it('shows a property rune as the pair its id picks, in the base colour', async () => {
    const host = await render({ kind: RuneBadgeKind.Property, id: FLAMING, name: 'Flaming' });

    expect(glyphsOf(host)).toBe(runicPair(FLAMING));
    expect(host.querySelector('.sr-only')?.textContent).toBe('Flaming');
    expect(host.querySelector('.bg-rune-base')).not.toBeNull();
  });

  it('shows an empty slot as a plus in an outline, with no tier colour', async () => {
    const host = await render({ kind: RuneBadgeKind.Hole });

    expect(glyphsOf(host)).toBe('+');
    expect(host.querySelector('.sr-only')?.textContent).toBe('Empty rune slot');
    expect(host.querySelector('[class*="bg-rune-"]')).toBeNull();
  });
});
