import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { DamageTone } from '@pioneer/frontier';
import { RollTotal } from '@pioneer/rules/dice';
import { DegreeOfSuccess, InlineKind, Selector } from '@pioneer/rules/sdk';
import type { CheckNode } from '@pioneer/rules/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { providePlayUiI18nTesting } from '../testing/provide-play-ui-testing';
import { DICE_ROLLER_FACTORY } from './dice-roller';
import type { DiceRollerFactory } from './dice-roller';
import { withDegree } from './roll-presentation';
import type { RollPresentation } from './roll-presentation';
import { RollPresenter } from './roll-presenter';
import { RollStage } from './roll-stage.component';

const FIREBALL: RollPresentation = {
  id: 1,
  label: 'Fireball',
  total: RollTotal.parse(21),
  lines: [{ total: 21, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' }],
  groups: [{ notation: '6d6@3,4,3,4,3,4', tone: DamageTone.Fire }],
};

/** Fireball's damage after a basic save halved it. */
const SAVED_LINE = { total: 10, unadjusted: 21, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' };

const LONGSWORD: RollPresentation = {
  id: 3,
  label: 'Longsword',
  total: RollTotal.parse(35),
  lines: [
    { total: 25, tone: DamageTone.Physical, typeKey: 'roll.damageType.slashing' },
    { total: 10, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' },
  ],
  groups: [],
};

const BASIC_REFLEX: CheckNode = { type: InlineKind.Check, statistic: Selector.parse('save:reflex'), basic: true };

const PERCEPTION: RollPresentation = {
  id: 2,
  label: 'Perception',
  total: RollTotal.parse(16),
  lines: [{ total: 16, tone: undefined, typeKey: undefined }],
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

  it('names the result in the toast: the total, the roll and the damage type, coloured by that type', async () => {
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

  it('names the degree a check reached and what it does in the toast', async () => {
    reduceMotion(true);
    const { fixture, presenter } = await render();
    presenter.present(withDegree(PERCEPTION, DegreeOfSuccess.Success, BASIC_REFLEX));
    await fixture.whenStable();
    const status = hostOf(fixture).querySelector('[role="status"]');
    expect(status?.textContent).toContain('Success');
    expect(status?.textContent).toContain('Takes half damage');
  });

  it('shows the dice total beside what a basic save left of it', async () => {
    reduceMotion(true);
    const { fixture, presenter } = await render();
    presenter.present({ ...FIREBALL, lines: [SAVED_LINE] });
    await fixture.whenStable();
    const status = hostOf(fixture).querySelector('[role="status"]');
    expect(status?.textContent).toContain('10');
    expect(status?.textContent).toContain('of 21');
  });

  it('names no degree for a roll that was not against a DC', async () => {
    reduceMotion(true);
    const { fixture, presenter } = await render();
    presenter.present(PERCEPTION);
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('[role="status"]')?.textContent).not.toContain('Takes');
  });

  it('shows one toast row per damage type, each in its own colour', async () => {
    reduceMotion(true);
    const { fixture, presenter } = await render();
    presenter.present(LONGSWORD);
    await fixture.whenStable();
    const status = hostOf(fixture).querySelector('[role="status"]');
    expect(status?.querySelector('.text-damage-physical')?.textContent.trim()).toBe('25');
    expect(status?.querySelector('.text-damage-fire')?.textContent.trim()).toBe('10');
    expect(status?.textContent).toContain('Slashing');
    expect(status?.textContent).toContain('Fire');
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

  it('puts the dice on an overlay while they roll, and shows no toast until they settle', async () => {
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
