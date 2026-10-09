import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
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

function iconName(fixture: ComponentFixture<Disclosure>): string | undefined {
  return (fixture.nativeElement as HTMLElement).querySelector('summary svg')?.getAttribute('class') ?? undefined;
}

/** The browser fires `toggle` after `open` changes; jsdom does not, so the spec dispatches it. */
function toggleFromBrowser(fixture: ComponentFixture<Disclosure>, open: boolean): void {
  const element = details(fixture);
  element.open = open;
  element.dispatchEvent(new Event('toggle'));
  fixture.detectChanges();
}

describe(Disclosure, () => {
  it('renders the summary inside a native details element', () => {
    const fixture = render(false);
    expect(details(fixture).querySelector(':scope > summary')).not.toBeNull();
    expect(details(fixture).open).toBe(false);
  });

  it('opens the details when open is set', () => {
    expect(details(render(true)).open).toBe(true);
  });

  it('mirrors a toggle by the user into open', () => {
    const fixture = render(false);
    toggleFromBrowser(fixture, true);
    expect(fixture.componentInstance.open()).toBe(true);
    toggleFromBrowser(fixture, false);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('points the chevron down when closed and up when open', () => {
    const fixture = render(false);
    expect(iconName(fixture)).toContain('chevron-down');
    toggleFromBrowser(fixture, true);
    expect(iconName(fixture)).toContain('chevron-up');
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
