import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { CharacterAvatar } from './character-avatar.component';

const PORTRAIT = 'https://example.test/seelah.webp';

// A host is the only way to project badges into the avatar.
@Component({
  selector: 'fr-character-avatar-host',
  imports: [CharacterAvatar],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `
    <fr-character-avatar name="Seelah" [current]="12" [max]="20">
      <span frCharacterAvatarStart>start</span>
      <span frCharacterAvatarEnd>end</span>
    </fr-character-avatar>
  `,
})
class BadgeHost {}

async function render(inputs: Readonly<Record<string, unknown>>): Promise<ComponentFixture<CharacterAvatar>> {
  TestBed.configureTestingModule({ providers: [provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(CharacterAvatar);
  for (const [name, value] of Object.entries({ name: 'Seelah', current: 12, max: 20, ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture;
}

function host(fixture: ComponentFixture<CharacterAvatar>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function paths(fixture: ComponentFixture<CharacterAvatar>): readonly SVGPathElement[] {
  return [...host(fixture).querySelectorAll<SVGPathElement>('svg[viewBox="0 0 100 100"] path')];
}

describe(CharacterAvatar, () => {
  it('shows the picture clipped to a circle, with the name written once', async () => {
    const fixture = await render({ src: PORTRAIT });
    expect(host(fixture).querySelector('img')?.getAttribute('alt')).toBe('');
    expect(host(fixture).querySelector('.clip-circle')).not.toBeNull();
    expect(host(fixture).textContent).toContain('Seelah');
  });

  it('falls back to initials without a picture', async () => {
    const fixture = await render({ name: 'Seelah of the Dawn' });
    expect(host(fixture).querySelector('img')).toBeNull();
    expect(host(fixture).querySelector('.clip-circle')?.textContent.trim()).toBe('SD');
  });

  it('names the health bar for screen readers', async () => {
    const fixture = await render({});
    expect(host(fixture).querySelector('svg')?.getAttribute('aria-label')).toBe('Hit points 12 of 20');
  });

  it('names temporary hit points too', async () => {
    const fixture = await render({ temp: 5 });
    expect(host(fixture).querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Hit points 12 of 20, plus 5 temporary',
    );
  });

  it('fills the arc by the share of max', async () => {
    const [track, fill] = paths(await render({}));
    expect(track?.hasAttribute('stroke-dasharray')).toBe(false);
    expect(fill?.getAttribute('stroke-dasharray')).toBe('60 100');
  });

  it('draws temporary points after the hit points, scaled to fit', async () => {
    const [, fill, temp] = paths(await render({ current: 20, max: 20, temp: 5 }));
    expect(fill?.getAttribute('stroke-dasharray')).toBe('80 100');
    expect(temp?.getAttribute('stroke-dasharray')).toBe('0 80 20 100');
  });

  it('clamps current into 0..max', async () => {
    const over = await render({ current: 30 });
    expect(paths(over)[1]?.getAttribute('stroke-dasharray')).toBe('100 100');

    TestBed.resetTestingModule();
    const under = await render({ current: -4 });
    expect(paths(under)[1]?.getAttribute('stroke-dasharray')).toBe('0 100');
  });

  it.each([
    [20, 'stroke-success-solid'],
    [8, 'stroke-warning-solid'],
    [4, 'stroke-danger-solid'],
  ])('tones the fill by remaining hit points (%d)', async (current, tone) => {
    const [, fill] = paths(await render({ current }));
    expect(fill?.classList).toContain(tone);
  });

  it('draws no bar without a max', async () => {
    const fixture = await render({ max: 0, current: 0 });
    expect(host(fixture).querySelector('svg')).toBeNull();
  });

  it('shows no wounds above half HP', async () => {
    const fixture = await render({ current: 18 });
    expect(host(fixture).querySelector('fr-icon')).toBeNull();
    expect(host(fixture).querySelector('[class*="vignette-"]')).toBeNull();
    expect(host(fixture).querySelector('[class*="splatter-"]')).toBeNull();
  });

  it('adds a vignette, a splatter and a Bloodied cue at half HP and below', async () => {
    const fixture = await render({ current: 5 });
    expect(host(fixture).querySelector('.vignette-light')).not.toBeNull();
    expect(host(fixture).querySelector('.splatter-light')).not.toBeNull();
    expect(host(fixture).querySelector('fr-icon svg title')?.textContent).toBe('Bloodied');
  });

  it('is Dying at 0 HP with the strongest vignette', async () => {
    const fixture = await render({ current: 0 });
    expect(host(fixture).querySelector('.vignette-full')).not.toBeNull();
    expect(host(fixture).querySelector('fr-icon svg title')?.textContent).toBe('Dying');
  });

  it.each([
    [1, 'darkness-dim'],
    [2, 'darkness-dark'],
    [3, 'darkness-black'],
  ])('blackens the portrait after %d failed saves', async (failedSaves, overlay) => {
    const fixture = await render({ current: 0, failedSaves });
    expect(host(fixture).querySelector(`.${overlay}`)).not.toBeNull();
  });

  it('hides the overlays under forced colours and keeps the cue', async () => {
    const fixture = await render({ current: 0 });
    for (const overlay of host(fixture).querySelectorAll('[class*="vignette-"], [class*="splatter-"]')) {
      expect(overlay.classList).toContain('forced-colors:hidden');
    }
    expect(host(fixture).querySelector('fr-icon')).not.toBeNull();
  });

  it('projects badges into the top corners', async () => {
    TestBed.configureTestingModule({ providers: [provideFrontierI18nTesting()] });
    const fixture = TestBed.createComponent(BadgeHost);
    await fixture.whenStable();
    const corners = (fixture.nativeElement as HTMLElement).querySelectorAll('.-top-2xs');
    const [start, end] = corners;
    expect(start?.textContent.trim()).toBe('start');
    expect(end?.textContent.trim()).toBe('end');
  });
});
