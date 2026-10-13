import { TestBed } from '@angular/core/testing';
import { LucideFlame } from '@lucide/angular';
import { describe, expect, it } from 'vitest';

import { BadgeTone } from '../badge/badge.component';
import { Tag } from './tag.component';

async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(Tag);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(Tag, () => {
  it('shows its label in a badge', async () => {
    const host = await render({ label: 'Fire' });
    expect(host.querySelector('span')?.textContent.trim()).toBe('Fire');
  });

  it('passes the tone to the badge', async () => {
    const neutral = await render({ label: 'Fire' });
    const danger = await render({ label: 'Fire', tone: BadgeTone.Danger });
    expect(danger.querySelector('span')?.className).not.toBe(neutral.querySelector('span')?.className);
  });

  it('draws a leading icon when given one', async () => {
    const host = await render({ label: 'Fire', icon: LucideFlame });
    expect(host.querySelector('fr-icon')).not.toBeNull();
  });
});
