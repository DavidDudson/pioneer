import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FLYER_SPEEDS, STEP_SPEEDS, WALKER_SPEEDS } from '../testing/speed-fixtures';
import type { SpeedRow } from './speed-rows.component';
import { SpeedRows } from './speed-rows.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

async function render(speeds: readonly SpeedRow[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SpeedRows);
  fixture.componentRef.setInput('speeds', speeds);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(SpeedRows, () => {
  it('shows a placeholder per kind of movement while the speeds load', async () => {
    const host = await render(undefined);

    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(6);
  });

  it('shows the distance of a Speed the character has and None for the rest', async () => {
    const host = await render(WALKER_SPEEDS);

    expect(textOf(host)).toBe('Walk25 ftSwimNoneFlyNoneClimbNoneBurrowNoneStepNone');
    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(0);
  });

  it('shows every Speed the character has', async () => {
    const host = await render(FLYER_SPEEDS);

    expect(textOf(host)).toBe('Walk25 ftSwimNoneFly30 ftClimbNoneBurrowNoneStepNone');
  });

  it('shows the Step distance as a row of its own', async () => {
    const host = await render(STEP_SPEEDS);

    expect(textOf(host)).toContain('Step5 ft');
  });

  it('reads None for a character with no speeds at all', async () => {
    const host = await render([]);

    expect(textOf(host)).toBe('WalkNoneSwimNoneFlyNoneClimbNoneBurrowNoneStepNone');
  });
});
