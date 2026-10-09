import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LucideFlame } from '@lucide/angular';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Badge, BadgeTone, BadgeVariant } from './badge.component';

/** Renders a badge with `label` projected and returns its `<span>`. */
async function render(inputs: Readonly<Record<string, unknown>>, label = 'Fire'): Promise<HTMLSpanElement> {
  const text = document.createTextNode(label);
  const badge = createComponent(Badge, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[text]],
  });
  onTestFinished(() => {
    badge.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    badge.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(badge.hostView);
  await appRef.whenStable();
  const span = (badge.location.nativeElement as HTMLElement).querySelector('span');
  if (span === null) {
    throw new Error('fr-badge rendered no <span>');
  }
  return span;
}

/** Border, fill and text for each tone. Text and fill are the pair whose contrast was checked. */
const subtleClasses = {
  neutral: ['border-line-default', 'bg-surface-sunken', 'text-fg-default'],
  accent: ['border-accent-line', 'bg-accent-subtle', 'text-accent-fg'],
  danger: ['border-danger-line', 'bg-danger-subtle', 'text-danger-fg'],
  success: ['border-success-line', 'bg-success-subtle', 'text-success-fg'],
  warning: ['border-warning-line', 'bg-warning-subtle', 'text-warning-fg'],
  info: ['border-info-line', 'bg-info-subtle', 'text-info-fg'],
} as const satisfies Record<BadgeTone, readonly string[]>;

const solidClasses = {
  neutral: ['border-surface-inverse', 'bg-surface-inverse', 'text-fg-inverse'],
  accent: ['border-accent-emphasis', 'bg-accent-emphasis', 'text-accent-on-emphasis'],
  danger: ['border-danger-emphasis', 'bg-danger-emphasis', 'text-danger-on-emphasis'],
  success: ['border-success-emphasis', 'bg-success-emphasis', 'text-success-on-emphasis'],
  warning: ['border-warning-emphasis', 'bg-warning-emphasis', 'text-warning-on-emphasis'],
  info: ['border-info-emphasis', 'bg-info-emphasis', 'text-info-on-emphasis'],
} as const satisfies Record<BadgeTone, readonly string[]>;

describe(Badge, () => {
  it('projects its label into a neutral subtle badge by default', async () => {
    const span = await render({});
    expect(span.textContent.trim()).toBe('Fire');
    expect([...span.classList]).toStrictEqual(expect.arrayContaining([...subtleClasses.neutral]));
    expect(span.querySelector('svg')).toBeNull();
  });

  it.each(Object.values(BadgeTone))('draws a subtle %s badge with its border, tint and text', async (tone) => {
    const span = await render({ tone, variant: BadgeVariant.Subtle });
    expect([...span.classList]).toStrictEqual(expect.arrayContaining(['border', ...subtleClasses[tone]]));
  });

  it.each(Object.values(BadgeTone))('fills a solid %s badge with its emphasis colour and text', async (tone) => {
    const span = await render({ tone, variant: BadgeVariant.Solid });
    expect([...span.classList]).toStrictEqual(expect.arrayContaining(['border', ...solidClasses[tone]]));
  });

  it('shows a decorative leading icon before the label', async () => {
    const span = await render({ icon: LucideFlame });
    const first = span.firstElementChild;
    expect(first?.tagName).toBe('FR-ICON');
    expect(first?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(span.textContent.trim()).toBe('Fire');
  });
});
