import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { AttributeModifiers } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { FIGHTER_MODIFIERS, OPEN_BOOSTS } from '../testing/attributes-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { OpenBoostLine } from './attributes.component';
import { AttributesView } from './attributes.component';

async function render(
  modifiers: AttributeModifiers | undefined,
  open: readonly OpenBoostLine[] = [],
): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<AttributesView> = TestBed.createComponent(AttributesView);
  fixture.componentRef.setInput('modifiers', modifiers);
  fixture.componentRef.setInput('open', open);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function pairs(host: HTMLElement): (string | undefined)[][] {
  return [...host.querySelectorAll('fr-description-item')].map((item) => [
    item.querySelector('[role="term"]')?.textContent.trim(),
    item.querySelector('[role="definition"]')?.textContent.trim(),
  ]);
}

describe(AttributesView, () => {
  it('names each attribute with its modifier, always signed', async () => {
    const host = await render(FIGHTER_MODIFIERS);
    expect(pairs(host)).toStrictEqual([
      ['Strength', '+4'],
      ['Dexterity', '+2'],
      ['Constitution', '+0'],
      ['Intelligence', '+1'],
      ['Wisdom', '+1'],
      ['Charisma', '+0'],
    ]);
  });

  it('names the six attributes with a placeholder each while the modifiers load', async () => {
    const host = await render(undefined);
    expect(pairs(host).map(([term]) => term)).toStrictEqual([
      'Strength',
      'Dexterity',
      'Constitution',
      'Intelligence',
      'Wisdom',
      'Charisma',
    ]);
    expect(host.querySelectorAll('fr-description-item fr-skeleton')).toHaveLength(6);
  });

  it('lists the boosts still to place, by name, and nothing when every boost is placed', async () => {
    const open = await render(AttributeModifiers.none, OPEN_BOOSTS);
    expect(open.textContent).toContain('Boosts still to place');
    expect([...open.querySelectorAll('fr-list-item')].map((item) => item.textContent.trim())).toStrictEqual([
      'Class key attribute',
      'Level 1 boost',
    ]);
    TestBed.resetTestingModule();
    const placed = await render(AttributeModifiers.none);
    expect(placed.textContent).not.toContain('Boosts still to place');
  });
});
