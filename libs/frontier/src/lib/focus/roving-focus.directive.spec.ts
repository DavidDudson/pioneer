import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { RovingFocusHost } from '../testing/roving-focus-host';
import type { RovingFocusHostItem } from '../testing/roving-focus-host';
import { RovingFocus } from './roving-focus.directive';
import { RovingOrientation } from './roving-keys';

interface Rendered {
  readonly fixture: ComponentFixture<RovingFocusHost>;
  readonly group: HTMLElement;
  readonly buttons: readonly HTMLButtonElement[];
}

const THREE: readonly RovingFocusHostItem[] = [{ label: 'A' }, { label: 'B' }, { label: 'C' }];

function render(
  items: readonly RovingFocusHostItem[],
  orientation: RovingOrientation = RovingOrientation.Horizontal,
): Rendered {
  const fixture = TestBed.createComponent(RovingFocusHost);
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('orientation', orientation);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const group = host.querySelector<HTMLElement>('[role="toolbar"]');
  if (group === null) {
    throw new Error('Roving focus host has no group');
  }
  return { fixture, group, buttons: [...host.querySelectorAll('button')] };
}

function tabIndexes(rendered: Rendered): (string | null)[] {
  return rendered.buttons.map((button) => button.getAttribute('tabindex'));
}

function keydown(key: string, modifiers: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
}

/** Presses `key` on the focused element and returns the index of the button focused after it. */
function press(rendered: Rendered, key: string, modifiers: KeyboardEventInit = {}): number {
  document.activeElement?.dispatchEvent(keydown(key, modifiers));
  rendered.fixture.detectChanges();
  return rendered.buttons.indexOf(document.activeElement as HTMLButtonElement);
}

function focus(rendered: Rendered, index: number): void {
  rendered.buttons[index]?.focus();
  rendered.fixture.detectChanges();
}

describe(RovingFocus, () => {
  it('makes the first item the tab stop by default', () => {
    expect(tabIndexes(render(THREE))).toStrictEqual(['0', '-1', '-1']);
  });

  it('makes the selected item the tab stop until focus enters the group', () => {
    const rendered = render([{ label: 'A' }, { label: 'B', selected: true }, { label: 'C' }]);
    expect(tabIndexes(rendered)).toStrictEqual(['-1', '0', '-1']);
  });

  it('moves the tab stop to the item last focused', () => {
    const rendered = render([{ label: 'A' }, { label: 'B', selected: true }, { label: 'C' }]);
    focus(rendered, 2);
    expect(tabIndexes(rendered)).toStrictEqual(['-1', '-1', '0']);
  });

  it('moves the tab stop off an item that becomes disabled', () => {
    const rendered = render(THREE);
    rendered.fixture.componentRef.setInput('items', [{ label: 'A', disabled: true }, { label: 'B' }, { label: 'C' }]);
    rendered.fixture.detectChanges();
    expect(tabIndexes(rendered)).toStrictEqual(['-1', '0', '-1']);
  });

  it('gives the tab stop back to the selected item once focus leaves the group', () => {
    const rendered = render([{ label: 'A' }, { label: 'B', selected: true }, { label: 'C' }]);
    focus(rendered, 2);
    rendered.buttons[2]?.blur();
    rendered.fixture.detectChanges();
    expect(tabIndexes(rendered)).toStrictEqual(['-1', '0', '-1']);
  });

  it('wraps when asked', () => {
    const rendered = render(THREE);
    rendered.fixture.componentRef.setInput('wrap', true);
    rendered.fixture.detectChanges();
    focus(rendered, 2);
    expect(press(rendered, 'ArrowRight')).toBe(0);
  });

  it('leaves the arrow keys to a text field item', () => {
    const rendered = render([{ label: 'A' }, { label: 'Name', field: true }, { label: 'C' }]);
    const field = rendered.group.querySelector('input');
    field?.focus();
    const arrow = keydown('ArrowRight');
    field?.dispatchEvent(arrow);
    expect([document.activeElement === field, arrow.defaultPrevented]).toStrictEqual([true, false]);
  });

  it('moves focus with the arrow keys, Home and End', () => {
    const rendered = render(THREE);
    focus(rendered, 0);
    expect([press(rendered, 'ArrowRight'), press(rendered, 'End'), press(rendered, 'ArrowLeft')]).toStrictEqual([
      1, 2, 1,
    ]);
  });

  it('follows a right-to-left layout', () => {
    const rendered = render(THREE);
    rendered.group.style.direction = 'rtl';
    focus(rendered, 1);
    expect(press(rendered, 'ArrowLeft')).toBe(2);
  });

  it('counts grid columns from rovingColumns', () => {
    const rendered = render([...THREE, { label: 'D' }], RovingOrientation.Grid);
    rendered.fixture.componentRef.setInput('columns', 2);
    rendered.fixture.detectChanges();
    focus(rendered, 0);
    expect(press(rendered, 'ArrowDown')).toBe(2);
  });

  it('leaves Shift, Alt and Meta presses alone', () => {
    const rendered = render(THREE);
    focus(rendered, 0);
    expect([
      press(rendered, 'ArrowRight', { shiftKey: true }),
      press(rendered, 'ArrowRight', { altKey: true }),
      press(rendered, 'ArrowRight', { metaKey: true }),
    ]).toStrictEqual([0, 0, 0]);
  });

  it('keeps the default of keys it does not handle', () => {
    const rendered = render(THREE);
    const handled = keydown('ArrowRight');
    const ignored = keydown('a');
    rendered.buttons[0]?.dispatchEvent(handled);
    rendered.buttons[0]?.dispatchEvent(ignored);
    expect([handled.defaultPrevented, ignored.defaultPrevented]).toStrictEqual([true, false]);
  });
});
