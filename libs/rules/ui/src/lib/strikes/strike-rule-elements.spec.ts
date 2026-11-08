import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ELEMENT_STRIKE } from '../testing/strike-fixtures';
import { StrikesView } from './strikes.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

async function render(): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<StrikesView> = TestBed.createComponent(StrikesView);
  fixture.componentRef.setInput('strikes', ELEMENT_STRIKE);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('StrikesView rule elements', () => {
  it('lists the dice a rule element adds to the damage, each with its type, category and when it is rolled', async () => {
    const host = await render();

    const text = textOf(host);
    expect(text).toContain('Plus 1d6 fire precision');
    expect(text).toContain('Plus 1d6 cold on a critical hit');
    expect(text).toContain('On a critical hit, the target gains weakness 5 to fire until the end of your next turn');
    expect(text).toContain(
      'Gloom Walker: on a critical hit, the target is Slowed 1 until the end of your next turn, unless it succeeds at a DC 24 Fortitude save',
    );
    expect(text).toContain('Gloom Walker: a natural 19 on the attack is a critical hit, as long as it succeeds');
  });

  it('shows the reach a rule element gives the weapon', async () => {
    const host = await render();

    expect(textOf(host)).toContain('Reach 60 ft');
  });

  it('shows a note on the roll it is for, with its title and the degrees it shows on', async () => {
    const host = await render();

    const shown = [...host.querySelectorAll('pio-strike-notes')].map((each) => textOf(each));
    expect(shown).toStrictEqual(['GloomOn a critical success, a success The target is dazzled.', 'The flame lingers.']);
  });
});
