import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { SpellFilterChange, SpellFilterGroup } from './spell-filter-line';
import { SpellFilter } from './spell-filter.component';

const GROUPS: readonly SpellFilterGroup[] = [
  {
    id: 'trait',
    label: 'Traits',
    options: [
      { value: 'Fire', label: 'Fire', count: 2 },
      { value: 'Mental', label: 'Mental', count: 1 },
    ],
    selected: new Set(),
  },
  { id: 'damage', label: 'Damage type', options: [], selected: new Set() },
];

async function render(groups: readonly SpellFilterGroup[] = GROUPS): Promise<ComponentFixture<SpellFilter>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SpellFilter);
  fixture.componentRef.setInput('groups', groups);
  await fixture.whenStable();
  return fixture;
}

const host = (fixture: ComponentFixture<SpellFilter>): HTMLElement => fixture.nativeElement as HTMLElement;

describe(SpellFilter, () => {
  it('has a row for each group with something to pick, and none for an empty one', async () => {
    const fixture = await render();

    const summaries = [...host(fixture).querySelectorAll('fr-disclosure summary')].map((each) =>
      each.textContent.trim(),
    );
    expect(summaries).toStrictEqual(['Traits']);
  });

  it('words a chip with the spells it would leave', async () => {
    const fixture = await render();

    const chips = [...host(fixture).querySelectorAll('button[aria-pressed]')].map((each) => each.textContent.trim());
    expect(chips).toStrictEqual(['Fire (2)', 'Mental (1)']);
  });

  it('says which group changed and what it now picks', async () => {
    const fixture = await render();
    const changes: SpellFilterChange[] = [];
    fixture.componentInstance.changed.subscribe((change) => {
      changes.push(change);
    });

    host(fixture).querySelectorAll<HTMLButtonElement>('button[aria-pressed]')[1]?.click();

    expect(changes).toStrictEqual([{ group: 'trait', selected: new Set(['Mental']) }]);
  });

  it('lists the active filters and clears them in one action', async () => {
    const fixture = await render([{ ...GROUPS[0], selected: new Set(['Fire', 'Mental']) } as SpellFilterGroup]);
    let cleared = 0;
    fixture.componentInstance.cleared.subscribe(() => {
      cleared += 1;
    });

    expect(host(fixture).textContent).toContain('Showing only: Fire, Mental');
    const clear = [...host(fixture).querySelectorAll('button')].find(
      (each) => each.textContent.trim() === 'Clear filters',
    );
    clear?.click();

    expect(cleared).toBe(1);
  });

  it('shows no active line when nothing is picked', async () => {
    const fixture = await render();

    expect(host(fixture).textContent).not.toContain('Showing only');
  });
});
