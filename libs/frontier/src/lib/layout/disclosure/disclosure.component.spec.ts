import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ChevronDown, ChevronUp } from 'lucide';
import { describe, expect, it } from 'vitest';

import { Disclosure, DisclosureVariant } from './disclosure.component';

function render(open: boolean, variant: DisclosureVariant = DisclosureVariant.Plain): ComponentFixture<Disclosure> {
  const fixture = TestBed.createComponent(Disclosure);
  fixture.componentRef.setInput('open', open);
  fixture.componentRef.setInput('variant', variant);
  fixture.detectChanges();
  return fixture;
}

function details(fixture: ComponentFixture<Disclosure>): HTMLDetailsElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector('details');
  if (element === null) {
    throw new Error('fr-disclosure rendered no <details>');
  }
  return element;
}

/** The path the chevron is drawn with. */
function chevronPath(fixture: ComponentFixture<Disclosure>): string | undefined {
  return (fixture.nativeElement as HTMLElement).querySelector('summary svg path')?.getAttribute('d') ?? undefined;
}

/** Presses the summary like a user; the browser queues `toggle` as a task, so wait for it. */
async function press(fixture: ComponentFixture<Disclosure>): Promise<void> {
  details(fixture).querySelector('summary')?.click();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  fixture.detectChanges();
}

describe(Disclosure, () => {
  it('renders the summary inside a native details element', () => {
    const fixture = render(false);
    expect(details(fixture).querySelector(':scope > summary')).not.toBeNull();
    expect(details(fixture).open).toBe(false);
  });

  it('opens and closes from the open input', () => {
    const fixture = render(true);
    expect(details(fixture).open).toBe(true);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(details(fixture).open).toBe(false);
  });

  it('opens and closes on a press of the summary, and tells the parent', async () => {
    const fixture = render(false);
    const changes: boolean[] = [];
    fixture.componentInstance.open.subscribe((open) => {
      changes.push(open);
    });
    await press(fixture);
    expect(details(fixture).open).toBe(true);
    expect(fixture.componentInstance.open()).toBe(true);
    await press(fixture);
    expect(details(fixture).open).toBe(false);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(changes).toStrictEqual([true, false]);
  });

  it('points the chevron down when closed and up when open', async () => {
    const fixture = render(false);
    expect(chevronPath(fixture)).toBe(ChevronDown[0]?.[1]['d']);
    await press(fixture);
    expect(chevronPath(fixture)).toBe(ChevronUp[0]?.[1]['d']);
  });

  it('keeps the chevron decorative so the summary is named by its content', () => {
    const svg = (render(false).nativeElement as HTMLElement).querySelector('summary svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws a border only in the bordered variant', () => {
    expect(details(render(false, DisclosureVariant.Bordered)).classList).toContain('border');
    expect(details(render(false, DisclosureVariant.Plain)).classList).not.toContain('border');
  });
});
