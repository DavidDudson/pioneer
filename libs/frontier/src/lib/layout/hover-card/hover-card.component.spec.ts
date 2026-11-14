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

@Component({
  selector: 'fr-hover-card-focusable-host',
  imports: [HoverCard, HoverCardContent],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `
    <fr-hover-card focusLabel="Conditions of Kyra">
      <span id="trigger">Kyra</span>
      <ng-template frHoverCardContent>Wounded 2</ng-template>
    </fr-hover-card>
  `,
})
class FocusableHost {}

@Component({
  selector: 'fr-hover-card-nested-host',
  imports: [HoverCard, HoverCardContent],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `
    <fr-hover-card>
      <span id="trigger" tabindex="0">Fireball</span>
      <ng-template frHoverCardContent>
        Burst of flame
        <fr-hover-card>
          <span id="inner" tabindex="0">Fire</span>
          <ng-template frHoverCardContent>Deals fire damage</ng-template>
        </fr-hover-card>
      </ng-template>
    </fr-hover-card>
  `,
})
class NestedHost {}

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

  it('takes focus itself, named by the label, when given one for a trigger a keyboard cannot reach', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(FocusableHost);
    fixture.detectChanges();
    const focusable = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[tabindex="0"]');

    expect(focusable?.getAttribute('aria-label')).toBe('Conditions of Kyra');
    focusable?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()?.textContent).toContain('Wounded 2');
    });
  });

  it('adds no tab stop of its own without a label', () => {
    const fixture = render();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[tabindex]')).toHaveLength(1);
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

const cards = (): readonly HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')];

async function openBoth(): Promise<ComponentFixture<NestedHost>> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(NestedHost);
  fixture.detectChanges();
  trigger(fixture).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(cards()).toHaveLength(1);
  });
  document.querySelector<HTMLElement>('#inner')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(cards()).toHaveLength(2);
  });
  return fixture;
}

describe('a hover card nested in another card', () => {
  it('opens the inner card beside the outer one', async () => {
    await openBoth();

    expect(cards().map((each) => each.textContent.trim())).toStrictEqual([
      expect.stringContaining('Burst of flame'),
      'Deals fire damage',
    ]);
  });

  it('keeps the outer card open while the pointer is in the inner one', async () => {
    const fixture = await openBoth();
    // The inner card is not inside the outer one in the DOM, so moving onto it leaves the outer card.
    cards()[0]?.dispatchEvent(new MouseEvent('mouseleave'));
    cards()[1]?.dispatchEvent(new MouseEvent('mouseenter'));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 400);
    });
    fixture.detectChanges();

    expect(cards()).toHaveLength(2);
  });

  it('closes the inner card first, then the outer one, once the pointer leaves both', async () => {
    const fixture = await openBoth();
    cards()[0]?.dispatchEvent(new MouseEvent('mouseleave'));
    cards()[1]?.dispatchEvent(new MouseEvent('mouseenter'));
    cards()[1]?.dispatchEvent(new MouseEvent('mouseleave'));
    document.querySelector<HTMLElement>('#inner')?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(cards()).toHaveLength(1);
    });
    expect(cards()[0]?.textContent).toContain('Burst of flame');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(cards()).toHaveLength(0);
    });
  });

  it('closes only the top card on Escape, leaving the outer one open', async () => {
    const fixture = await openBoth();
    document
      .querySelector<HTMLElement>('#inner')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(cards()).toHaveLength(1);
    });

    expect(cards()[0]?.textContent).toContain('Burst of flame');
  });
});
