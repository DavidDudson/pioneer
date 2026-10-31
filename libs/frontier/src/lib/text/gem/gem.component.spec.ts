import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Gem } from './gem.component';

async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const gem = createComponent(Gem, { environmentInjector: TestBed.inject(EnvironmentInjector) });
  onTestFinished(() => {
    gem.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    gem.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(gem.hostView);
  await appRef.whenStable();
  return gem.location.nativeElement as HTMLElement;
}

describe(Gem, () => {
  it('hides the glyphs from screen readers, colours them by tone on a dark fill, and reads out the label', async () => {
    const host = await render({ tone: 'purple', glyphs: 'ᚠᚢ', label: 'Greater striking' });

    const glyphs = host.querySelector('[aria-hidden="true"]');
    expect(glyphs?.textContent.trim()).toBe('ᚠᚢ');
    expect(glyphs?.className).toContain('text-rune-greater');
    expect(glyphs?.className).toContain('bg-surface-base');
    expect(host.querySelector('.sr-only')?.textContent).toBe('Greater striking');
  });

  it('holds a black gem still, in the void colour', async () => {
    const host = await render({ tone: 'black', glyphs: 'ᚠ', label: 'Not applied' });

    expect(host.querySelector('.bg-rune-void')).not.toBeNull();
    expect(host.querySelector('[class*="animate-rune-pulse"]')).toBeNull();
    expect(host.querySelector('[aria-hidden="true"]')?.className).toContain('text-rune-void');
  });

  it('pulses a filled gem in its tone and holds a hole still', async () => {
    const filled = await render({ tone: 'gold', glyphs: 'ᚦ', label: 'Mythic striking' });
    const hole = await render({ glyphs: '+', label: 'Empty rune slot' });

    expect(filled.querySelector('.animate-rune-pulse, [class*="animate-rune-pulse"]')?.className).toContain(
      'motion-safe:animate-rune-pulse',
    );
    expect(hole.querySelector('.animate-rune-pulse, [class*="animate-rune-pulse"]')).toBeNull();
  });
});
