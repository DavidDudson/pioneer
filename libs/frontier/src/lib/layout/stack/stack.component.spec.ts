import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Stack } from './stack.component';

describe(Stack, () => {
  it('maps token inputs to literal utility classes', async () => {
    const fixture = TestBed.createComponent(Stack);
    fixture.componentRef.setInput('gap', 'lg');
    fixture.componentRef.setInput('direction', 'horizontal');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.className).toContain('gap-lg');
    expect(host.className).toContain('flex-row');
  });
});
