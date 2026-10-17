import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { HoverCardContent } from './hover-card-content.directive';
import { HoverCard } from './hover-card.component';

// A host is the only way to project a trigger and a content template into the card.
@Component({
  selector: 'fr-hover-card-host',
  imports: [HoverCard, HoverCardContent],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `
    <fr-hover-card>
      <span id="trigger" tabindex="0">Fireball</span>
      <ng-template frHoverCardContent>Burst of flame</ng-template>
    </fr-hover-card>
  `,
})
class Host {}

function render(): ComponentFixture<Host> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
}

function card(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

function trigger(fixture: ComponentFixture<Host>): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#trigger');
  if (element === null) {
    throw new Error('No trigger');
  }
  return element;
}

describe(HoverCard, () => {
  it('is closed until the trigger is focused', () => {
    render();
    expect(card()).toBeNull();
  });

  it('opens on focus and describes the trigger', async () => {
    const fixture = render();
    trigger(fixture).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()?.textContent).toContain('Burst of flame');
    });
    expect(card()?.id).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('[aria-describedby]')?.getAttribute('aria-describedby'),
    );
  });

  it('closes on Escape', async () => {
    const fixture = render();
    const element = trigger(fixture);
    element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()).not.toBeNull();
    });
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(card()).toBeNull();
    });
  });

  it('opens on pointer rest and closes when the pointer leaves', async () => {
    const fixture = render();
    const element = pointerTarget(fixture);
    element.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()).not.toBeNull();
    });
    element.dispatchEvent(new MouseEvent('mouseleave'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()).toBeNull();
    });
  });

  it('opens on a first touch tap without following the link, and lets the second tap through', async () => {
    const fixture = render();
    const element = trigger(fixture);
    const tap = (): MouseEvent => {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      element.dispatchEvent(click);
      return click;
    };
    expect(tap().defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()).not.toBeNull();
    });
    expect(tap().defaultPrevented).toBe(false);
  });
});

/** The span that listens for the pointer: mouseenter does not bubble from the projected trigger. */
function pointerTarget(fixture: ComponentFixture<Host>): HTMLElement {
  const element = trigger(fixture).parentElement;
  if (element === null) {
    throw new Error('No pointer target');
  }
  return element;
}
