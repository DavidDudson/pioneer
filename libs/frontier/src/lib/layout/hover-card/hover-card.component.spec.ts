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

@Component({
  selector: 'fr-hover-card-tap-host',
  imports: [HoverCard, HoverCardContent],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `
    <fr-hover-card [tapOpens]="false">
      <button id="trigger" type="button">Dismiss</button>
      <ng-template frHoverCardContent>Ends early</ng-template>
    </fr-hover-card>
  `,
})
class TapHost {}

function render(): ComponentFixture<Host> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
}

function card(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

function trigger(fixture: ComponentFixture<unknown>): HTMLElement {
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
    const tap = (): MouseEvent => click(element, 'touch');
    expect(tap().defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()).not.toBeNull();
    });
    expect(tap().defaultPrevented).toBe(false);
  });

  it('lets a touch tap through to the trigger when tapOpens is off, leaving the card closed', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(TapHost);
    fixture.detectChanges();
    expect(click(trigger(fixture), 'touch').defaultPrevented).toBe(false);
    fixture.detectChanges();
    expect(card()).toBeNull();
  });

  it('does not swallow a keyboard Enter after a touch that scrolled instead of tapping', () => {
    const fixture = render();
    const element = trigger(fixture);
    // A touch scroll fires pointerdown but never a click.
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    expect(click(element, '').defaultPrevented).toBe(false);
  });

  it('does not treat a mouse click after a touch tap as a tap', async () => {
    const fixture = render();
    const element = trigger(fixture);
    click(element, 'touch');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()).not.toBeNull();
    });
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(card()).toBeNull();
    });
    expect(click(element, 'mouse').defaultPrevented).toBe(false);
  });
});

/** A click as the browser fires it: a PointerEvent whose type says what produced it ('' for a keyboard Enter). */
function click(element: HTMLElement, pointerType: string): MouseEvent {
  const event = new PointerEvent('click', { bubbles: true, cancelable: true, pointerType });
  element.dispatchEvent(event);
  return event;
}

/** The span that listens for the pointer: mouseenter does not bubble from the projected trigger. */
function pointerTarget(fixture: ComponentFixture<Host>): HTMLElement {
  const element = trigger(fixture).parentElement;
  if (element === null) {
    throw new Error('No pointer target');
  }
  return element;
}
