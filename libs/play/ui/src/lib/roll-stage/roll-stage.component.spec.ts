import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { DamageTone } from '@pioneer/frontier';
import { RollTotal } from '@pioneer/rules/dice';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { providePlayUiI18nTesting } from '../testing/provide-play-ui-testing';
import { DICE_ROLLER_FACTORY } from './dice-roller';
import type { DiceRollerFactory } from './dice-roller';
import type { RollPresentation } from './roll-presentation';
import { RollPresenter } from './roll-presenter';
import { RollStage } from './roll-stage.component';

const FIREBALL: RollPresentation = {
  id: 1,
  label: 'Fireball',
  total: RollTotal.parse(21),
  damageTypeKey: 'roll.damageType.fire',
  tone: DamageTone.Fire,
  groups: [{ notation: '6d6@3,4,3,4,3,4', tone: DamageTone.Fire }],
};

const PERCEPTION: RollPresentation = {
  id: 2,
  label: 'Perception',
  total: RollTotal.parse(16),
  damageTypeKey: undefined,
  tone: undefined,
  groups: [],
};

interface Rendered {
  readonly fixture: ComponentFixture<RollStage>;
  readonly presenter: RollPresenter;
  readonly surfaces: HTMLElement[];
}

async function render(): Promise<Rendered> {
  const surfaces: HTMLElement[] = [];
  const factory: DiceRollerFactory = async (surface) => {
    surfaces.push(surface);
    return { roll: async () => Promise.withResolvers<undefined>().promise, dispose: () => undefined };
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [providePlayUiI18nTesting(), { provide: DICE_ROLLER_FACTORY, useValue: factory }],
  });
  const fixture = TestBed.createComponent(RollStage);
  await fixture.whenStable();
  return { fixture, presenter: TestBed.inject(RollPresenter), surfaces };
}

function hostOf(fixture: ComponentFixture<RollStage>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function reduceMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }));
}

describe(RollStage, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps an empty status region and no overlay while nothing is rolled', async () => {
    reduceMotion(false);
    const { fixture } = await render();
    const host = hostOf(fixture);
    expect(host.querySelector('[role="status"]')?.textContent.trim()).toBe('');
    expect(host.querySelector('fr-screen-overlay')).toBeNull();
  });

  it('names the result in a pill: the total, the roll and the damage type, coloured by that type', async () => {
    reduceMotion(true);
    const { fixture, presenter } = await render();
    presenter.present(FIREBALL);
    await fixture.whenStable();
    const status = hostOf(fixture).querySelector('[role="status"]');
    expect(status?.textContent).toContain('21');
    expect(status?.textContent).toContain('Fireball');
    expect(status?.textContent).toContain('Fire');
    expect(status?.querySelector('.text-damage-fire')?.textContent.trim()).toBe('21');
  });

  it('shows an untyped roll in the default colour with no type name', async () => {
    reduceMotion(true);
    const { fixture, presenter } = await render();
    presenter.present(PERCEPTION);
    await fixture.whenStable();
    const status = hostOf(fixture).querySelector('[role="status"]');
    expect(status?.textContent).toContain('16');
    expect(status?.querySelector('[class*="text-damage-"]')).toBeNull();
  });

  it('puts the dice on an overlay while they roll, and shows no pill until they settle', async () => {
    reduceMotion(false);
    const { fixture, presenter, surfaces } = await render();
    presenter.present(FIREBALL);
    await fixture.whenStable();
    const host = hostOf(fixture);
    expect(host.querySelector('fr-screen-overlay')).not.toBeNull();
    expect(surfaces).toHaveLength(1);
    expect(host.querySelector('fr-screen-overlay > div')).toBe(surfaces[0]);
    expect(host.querySelector('[role="status"]')?.textContent.trim()).toBe('');
  });
});
