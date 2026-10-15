import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ALTERED_STRIKE, STEEL_SHIELD } from '../testing/strike-fixtures';
import { StrikesView } from './strikes.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

describe('StrikesView item alterations', () => {
  it('lists the materials and property runes alterations give a weapon, and its traits as altered', async () => {
    TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
    const fixture: ComponentFixture<StrikesView> = TestBed.createComponent(StrikesView);
    fixture.componentRef.setInput('strikes', ALTERED_STRIKE);
    fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
    await fixture.whenStable();

    const text = textOf(fixture.nativeElement as HTMLElement);
    expect(text).toContain('Made of cold iron');
    expect(text).toContain('Property runes: flaming');
    expect(text).toContain('Agile');
  });

  it('shows a shield with the Hardness and Hit Points given to it', async () => {
    TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
    const fixture: ComponentFixture<StrikesView> = TestBed.createComponent(StrikesView);
    fixture.componentRef.setInput('strikes', []);
    fixture.componentRef.setInput('shields', [{ ...STEEL_SHIELD, hardness: 8, hitPoints: 40, brokenThreshold: 20 }]);
    await fixture.whenStable();

    expect(textOf(fixture.nativeElement as HTMLElement)).toContain(
      'Steel Shield: Hardness 8, HP 40, Broken Threshold 20',
    );
  });
});
