import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { AttributeModifiers } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { FIGHTER_MODIFIERS } from '../testing/attributes-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { AttributeRolls } from './attribute-rolls.component';
import type { AttributeRoll } from './attribute-rolls.component';

interface Rendered {
  readonly host: HTMLElement;
  readonly rolls: AttributeRoll[];
}

async function render(modifiers: AttributeModifiers | undefined): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<AttributeRolls> = TestBed.createComponent(AttributeRolls);
  const rolls: AttributeRoll[] = [];
  fixture.componentInstance.rolled.subscribe((roll) => {
    rolls.push(roll);
  });
  fixture.componentRef.setInput('modifiers', modifiers);
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement, rolls };
}

describe(AttributeRolls, () => {
  it('shows each attribute and its signed modifier on one row', async () => {
    const { host } = await render(FIGHTER_MODIFIERS);
    const rows = [...host.querySelectorAll('fr-stack fr-stack')].map((row) => row.textContent.replaceAll(/\s+/gu, ''));
    expect(rows).toStrictEqual(['Str+4', 'Dex+2', 'Con+0', 'Int+1', 'Wis+1', 'Cha+0']);
  });

  it('shows a placeholder for each modifier while they load', async () => {
    const { host } = await render(undefined);
    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(6);
    expect(host.querySelectorAll('button')).toHaveLength(0);
  });

  it('asks for the flat check of the attribute pressed', async () => {
    const { host, rolls } = await render(FIGHTER_MODIFIERS);
    host.querySelector('button')?.click();
    expect(rolls).toHaveLength(1);
    expect(rolls[0]?.modifier).toBe(4);
  });
});
