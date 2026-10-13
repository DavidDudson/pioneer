import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { FileButton } from './file-button.component';

interface Rendered {
  readonly root: HTMLElement;
  readonly ref: ComponentRef<FileButton>;
  readonly chosen: string[];
}

async function render(inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  const ref = createComponent(FileButton, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Choose a file')]],
  });
  onTestFinished(() => {
    ref.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    ref.setInput(name, value);
  }
  const chosen: string[] = [];
  ref.instance.chosen.subscribe((text) => {
    chosen.push(text);
  });
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(ref.hostView);
  await appRef.whenStable();
  return { root: ref.location.nativeElement as HTMLElement, ref, chosen };
}

function present<TValue>(value: TValue | null): TValue {
  if (value === null) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

describe(FileButton, () => {
  it('opens the file picker when the button is pressed', async () => {
    const { root } = await render();
    const picker = present(root.querySelector('input'));
    const open = vi.spyOn(picker, 'click').mockReturnValue(undefined);

    present(root.querySelector('button')).click();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('passes the accepted types to the picker', async () => {
    const { root } = await render({ accept: '.json' });

    expect(present(root.querySelector('input')).accept).toBe('.json');
  });

  it('emits the text of the chosen file', async () => {
    const { root, chosen } = await render();
    const picker = present(root.querySelector('input'));
    const file = new File(['{"a":1}'], 'kyra.pioneer.json', { type: 'application/json' });
    Object.defineProperty(picker, 'files', { value: [file], configurable: true });

    picker.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(chosen).toStrictEqual(['{"a":1}']);
    });
  });

  it('does not open when disabled', async () => {
    const { root } = await render({ disabled: true });

    expect(present(root.querySelector('button')).disabled).toBe(true);
  });
});
