import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActionCost, ContentId } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { ActionUser } from '../actions/action-user';
import type { ActionUse } from '../actions/action-user';
import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FIGHTER_STRIKES } from '../testing/strike-fixtures';
import { StrikesView } from './strikes.component';
import type { NamedStrike } from './strikes.component';

const LONGSWORD = ContentId.parse('00000000-0000-4000-8000-0000000000a1');

/** `strikes` with a Use for one action on each, as the sheet adds it. */
function usable(strikes: readonly NamedStrike[], affordable: boolean): readonly NamedStrike[] {
  return strikes.map((named): NamedStrike => ({
    ...named,
    use: { id: LONGSWORD, name: named.name, cost: ActionCost.One, affordable },
  }));
}

async function render(
  strikes: readonly NamedStrike[],
  used: ActionUse[] | undefined,
): Promise<ComponentFixture<StrikesView>> {
  const user: ActionUser = {
    use: async (request): Promise<void> => {
      used?.push(request);
      await Promise.resolve();
    },
  };
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      provideTanStackQuery(new QueryClient()),
      ...(used === undefined ? [] : [{ provide: ActionUser, useValue: user }]),
    ],
  });
  const fixture = TestBed.createComponent(StrikesView);
  fixture.componentRef.setInput('strikes', strikes);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture;
}

function useButtons(fixture: ComponentFixture<StrikesView>): HTMLButtonElement[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('pio-use-buttons button')].filter(
    (button): button is HTMLButtonElement => button instanceof HTMLButtonElement,
  );
}

describe('using a Strike', () => {
  it('shows a Use button for each Strike and spends its weapon when it is clicked', async () => {
    const used: ActionUse[] = [];
    const fixture = await render(usable(FIGHTER_STRIKES, true), used);
    const buttons = useButtons(fixture);

    expect(buttons).toHaveLength(FIGHTER_STRIKES.length);
    buttons[0]?.click();
    await fixture.whenStable();

    expect(used).toHaveLength(1);
    expect(used[0]?.line.id).toBe(LONGSWORD);
    expect(used[0]?.line.cost).toBe(ActionCost.One);
  });

  it('offers no Use button when the turn has no action left for it', async () => {
    const fixture = await render(usable(FIGHTER_STRIKES, false), []);
    expect(useButtons(fixture)).toHaveLength(0);
  });

  it('offers no Use button on a page that spends nothing', async () => {
    const fixture = await render(usable(FIGHTER_STRIKES, true), undefined);
    expect(useButtons(fixture)).toHaveLength(0);
  });
});
