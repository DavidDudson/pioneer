import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AsyncStatus } from '../../async/async-action';
import { InputGroupHost } from '../../testing/input-group-host';
import { InputGroup } from './input-group.component';

interface Rendered {
  readonly group: HTMLElement;
  readonly fixture: ComponentFixture<InputGroupHost>;
}

function render(): Rendered {
  const fixture = TestBed.createComponent(InputGroupHost);
  fixture.detectChanges();
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const group = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('fr-input-group');

  if (group === null) {
    throw new Error('Expected a group');
  }

  return { group, fixture };
}

describe(InputGroup, () => {
  it('keeps any number of addons around the input, in the order written', () => {
    const { group } = render();
    expect([...group.children].map((child) => child.tagName.toLowerCase())).toStrictEqual([
      'fr-input-addon',
      'fr-input',
      'fr-input-addon',
      'fr-input-addon',
      'fr-input-addon',
    ]);
  });

  it('draws the box itself and leaves the input flat', () => {
    const { group } = render();
    const input = group.querySelector('input');
    expect(group.classList).toContain('border');
    expect(input?.classList).not.toContain('border');
    expect(input?.classList).toContain('bg-transparent');
  });

  it('lets presses through a decorative addon but not an action one', () => {
    const [decorative, , action] = [...render().group.querySelectorAll('fr-input-addon')];
    expect(decorative?.classList).toContain('pointer-events-none');
    expect(action?.classList).not.toContain('pointer-events-none');
  });

  it('focuses the input when a press lands on a decorative addon', () => {
    const { group, fixture } = render();
    // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
    document.body.append(fixture.nativeElement as HTMLElement);
    const decorative = group.querySelector('fr-input-addon');
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    decorative?.dispatchEvent(press);
    expect(document.activeElement).toBe(group.querySelector('input'));
    expect(press.defaultPrevented).toBe(true);
  });

  it('shows the status of a load on its border, and the invalid state', () => {
    const { group, fixture } = render();
    expect(group.dataset['status']).toBeUndefined();
    fixture.componentRef.setInput('status', AsyncStatus.Pending);
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(group.dataset['status']).toBe('pending');
    expect(group.classList).toContain('border-danger-line');
  });
});
