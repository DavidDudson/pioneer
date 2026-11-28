import { TestBed } from '@angular/core/testing';
import { Trait } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FamiliarCardMovement, FamiliarCardSense, FamiliarCardStatus } from './familiar-card';
import type { FamiliarCardView } from './familiar-card';
import { FamiliarCard } from './familiar-card.component';

const PIP: FamiliarCardView = {
  name: 'Pip',
  species: 'Raven',
  status: FamiliarCardStatus.Active,
  hitPoints: { current: 25, max: 25, temp: 0 },
  armorClass: 24,
  saves: { fortitude: 12, reflex: 10, will: 14 },
  perception: 9,
  skills: [{ name: 'Stealth', modifier: 9 }],
  speeds: [{ movement: FamiliarCardMovement.Land, feet: 25 }],
  senses: [FamiliarCardSense.LowLightVision],
  traits: [Trait.parse('minion')],
};

async function render(familiar: FamiliarCardView): Promise<string> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(FamiliarCard);
  fixture.componentRef.setInput('familiar', familiar);
  await fixture.whenStable();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const host = fixture.nativeElement as HTMLElement;

  return host.textContent.replaceAll(/\s+/gu, ' ');
}

describe(FamiliarCard, () => {
  it('shows the name, status and numbers of an active familiar', async () => {
    const text = await render(PIP);

    expect(text).toContain('Pip');
    expect(text).toContain('Active');
    expect(text).toContain('Fortitude');
    expect(text).toContain('+12');
    expect(text).toContain('Low-light vision');
  });

  it('says a dead familiar is dead and keeps its numbers', async () => {
    const text = await render({ ...PIP, status: FamiliarCardStatus.Dead });

    expect(text).toContain('Dead');
    expect(text).toContain('Fortitude');
  });

  it('shows an absorbed familiar by name and status only', async () => {
    const text = await render({ ...PIP, status: FamiliarCardStatus.Absorbed });

    expect(text).toContain('Absorbed');
    expect(text).not.toContain('Fortitude');
  });

  it('names no temporary Hit Points when there are none', async () => {
    const text = await render(PIP);

    expect(text).not.toContain('temporary');
  });

  it('names temporary Hit Points when there are some', async () => {
    const text = await render({ ...PIP, hitPoints: { current: 20, max: 25, temp: 5 } });

    expect(text).toContain('5 temporary');
  });
});
