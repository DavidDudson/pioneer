import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { InputAddon } from './input-addon.component';

function render(action: boolean): HTMLElement {
  const fixture = TestBed.createComponent(InputAddon);
  fixture.componentRef.setInput('action', action);
  fixture.detectChanges();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return fixture.nativeElement as HTMLElement;
}

describe(InputAddon, () => {
  it('is decorative by default: presses pass through to the input', () => {
    const host = render(false);
    expect(host.classList).toContain('pointer-events-none');
    expect(host.classList).toContain('text-fg-subtle');
  });

  it('takes presses when it holds actions, and is no wider than its buttons', () => {
    const host = render(true);
    expect(host.classList).not.toContain('pointer-events-none');
    expect(host.classList).not.toContain('min-w-control-md');
  });
});
