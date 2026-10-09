import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LucideFlame } from '@lucide/angular';
import { describe, expect, it } from 'vitest';

import { Badge, BadgeTone, BadgeVariant } from './badge.component';

/** Renders a badge with `label` projected and returns its `<span>`. */
async function render(inputs: Readonly<Record<string, unknown>>, label = 'Fire'): Promise<HTMLSpanElement> {
  const text = document.createTextNode(label);
  const badge = createComponent(Badge, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[text]],
  });
  for (const [name, value] of Object.entries(inputs)) {
    badge.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(badge.hostView);
  document.body.append(badge.location.nativeElement as HTMLElement);
  await appRef.whenStable();
  const span = (badge.location.nativeElement as HTMLElement).querySelector('span');
  if (span === null) {
    throw new Error('fr-badge rendered no <span>');
  }
  return span;
}

const subtleFill = {
  neutral: 'bg-surface-sunken',
  accent: 'bg-accent-subtle',
  danger: 'bg-danger-subtle',
  success: 'bg-success-subtle',
  warning: 'bg-warning-subtle',
  info: 'bg-info-subtle',
} as const satisfies Record<BadgeTone, string>;

const solidFill = {
  neutral: 'bg-surface-inverse',
  accent: 'bg-accent-emphasis',
  danger: 'bg-danger-emphasis',
  success: 'bg-success-emphasis',
  warning: 'bg-warning-emphasis',
  info: 'bg-info-emphasis',
} as const satisfies Record<BadgeTone, string>;

describe(Badge, () => {
  it('projects its label into a neutral subtle badge by default', async () => {
    const span = await render({});
    expect(span.textContent.trim()).toBe('Fire');
    expect(span.classList).toContain(subtleFill.neutral);
    expect(span.querySelector('svg')).toBeNull();
  });

  it.each(Object.values(BadgeTone))('fills a subtle %s badge with its tinted surface and a border', async (tone) => {
    const span = await render({ tone, variant: BadgeVariant.Subtle });
    expect(span.classList).toContain(subtleFill[tone]);
    expect(span.classList).toContain('border');
  });

  it.each(Object.values(BadgeTone))('fills a solid %s badge with its emphasis colour', async (tone) => {
    const span = await render({ tone, variant: BadgeVariant.Solid });
    expect(span.classList).toContain(solidFill[tone]);
    expect(span.classList).toContain('border');
  });

  it('shows a decorative leading icon before the label', async () => {
    const span = await render({ icon: LucideFlame });
    const first = span.firstElementChild;
    expect(first?.tagName).toBe('FR-ICON');
    expect(first?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(span.textContent.trim()).toBe('Fire');
  });
});
