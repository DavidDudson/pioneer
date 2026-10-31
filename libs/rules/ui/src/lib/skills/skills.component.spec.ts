import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Proficiency } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import type { NamedStatistic } from '../statistics/statistics.component';
import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { SKILL_STATISTICS } from '../testing/skill-fixtures';
import { SkillsView } from './skills.component';

async function render(statistics: readonly NamedStatistic[] | undefined): Promise<ComponentFixture<SkillsView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SkillsView);
  fixture.componentRef.setInput('statistics', statistics);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture;
}

function present<TValue>(value: TValue | null): TValue {
  if (value === null) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function hostOf(fixture: ComponentFixture<SkillsView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rowNames(host: HTMLElement): string[] {
  return [...host.querySelectorAll('pio-statistics [role="listitem"]')]
    .filter((item) => item.closest('pio-breakdown') === null)
    .map((item) => item.textContent.trim());
}

async function chooseLores(fixture: ComponentFixture<SkillsView>): Promise<void> {
  const lores = [...hostOf(fixture).querySelectorAll('fr-segmented button')].find(
    (button) => button.textContent.trim() === 'Lores',
  );
  (lores as HTMLElement).click();
  await fixture.whenStable();
}

describe(SkillsView, () => {
  it('lists the skills first and leaves the Lores to their own tab', async () => {
    const fixture = await render(SKILL_STATISTICS);
    const rows = rowNames(hostOf(fixture));
    expect(rows).toHaveLength(3);
    expect(rows.some((row) => row.startsWith('Sailing Lore'))).toBe(false);
  });

  it('lists only the Lores once their tab is chosen', async () => {
    const fixture = await render(SKILL_STATISTICS);
    await chooseLores(fixture);
    const rows = rowNames(hostOf(fixture));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('Sailing Lore');
  });

  it("leaves a Lore the character has no rank in off the Lores tab, which lists the character's own", async () => {
    const untrained = SKILL_STATISTICS.map((each) => ({ ...each, rank: Proficiency.Untrained }));
    const fixture = await render(untrained);
    await chooseLores(fixture);
    expect(hostOf(fixture).textContent).toContain('No Lores yet.');
  });

  it('lays a skill out as its name, then its rank, with no disclosure caret or breakdown icon', async () => {
    const host = hostOf(await render(SKILL_STATISTICS));

    expect(host.querySelector('fr-disclosure')).toBeNull();
    const line = present(host.querySelector('pio-skill-line'));
    const badge = present(line.querySelector('pio-proficiency-badge'));
    const name = present(line.querySelector('fr-text'));
    const order = [...line.querySelectorAll('fr-text, pio-proficiency-badge')];
    expect(order.indexOf(name)).toBeLessThan(order.indexOf(badge));
    expect(line.querySelector('pio-breakdown')).toBeNull();
  });

  it('says so when the character has no Lores', async () => {
    const fixture = await render(SKILL_STATISTICS.filter(({ name }) => !name.endsWith('Lore')));
    await chooseLores(fixture);
    expect(hostOf(fixture).textContent).toContain('No Lores yet.');
  });

  it('shows placeholder rows while the statistics load', async () => {
    const fixture = await render(undefined);
    expect(hostOf(fixture).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
  });
});
