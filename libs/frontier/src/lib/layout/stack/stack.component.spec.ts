import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Stack } from './stack.component';

async function render(inputs: Readonly<Record<string, unknown>>): Promise<{ host: HTMLElement; flex: Element }> {
  const fixture = TestBed.createComponent(Stack);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const flex = host.firstElementChild;
  if (flex === null) {
    throw new Error('Stack rendered no inner element');
  }
  return { host, flex };
}

describe(Stack, () => {
  it('maps token inputs to literal utility classes', async () => {
    const { flex } = await render({ gap: 'lg', direction: 'horizontal' });
    expect(flex.className).toContain('gap-lg');
    expect(flex.className).toContain('flex-row');
  });

  it('is not a query container unless responsive', async () => {
    const { host } = await render({});
    expect(host.className).not.toContain('@container');
  });

  it('stacks when narrow and becomes a row from its own container size', async () => {
    const { host, flex } = await render({ horizontalFrom: 'md' });
    expect(host.className).toContain('@container');
    expect(flex.className).toContain('flex-col');
    expect(flex.className).toContain('@md:flex-row');
  });
});
