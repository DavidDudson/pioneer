import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { element, part, renderProjected } from '../../testing/render-projected';
import { Modal } from './modal.component';

const settle = async (): Promise<void> => {
  await TestBed.inject(ApplicationRef).whenStable();
  await Promise.resolve();
};

const calls: string[] = [];

/** Jsdom has no `<dialog>` methods: record the calls and mirror `open`. */
function fakeDialog(): void {
  calls.length = 0;
  for (const [name, open] of [
    ['show', true],
    ['showModal', true],
    ['close', false],
  ] as const) {
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value(this: HTMLDialogElement): void {
        calls.push(name);
        this.toggleAttribute('open', open);
      },
    });
  }
  onTestFinished(() => {
    for (const name of ['show', 'showModal', 'close']) {
      Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
  });
}

async function render(open: boolean): Promise<HTMLElement> {
  const root = await renderProjected(Modal, { title: 'Hit Points', open }, [element('p', 'Damage or heal')]);
  document.body.append(root);
  onTestFinished(() => {
    root.remove();
  });
  await settle();
  return root;
}

describe(Modal, () => {
  beforeEach(() => {
    fakeDialog();
    TestBed.configureTestingModule({ providers: [provideFrontierI18nTesting()] });
  });

  it('renders nothing while closed', async () => {
    const root = await render(false);

    expect(root.querySelector('dialog')).toBeNull();
  });

  it('shows a labelled dialog as a modal when open, with the content in it', async () => {
    const root = await render(true);

    expect(part(root, 'dialog').getAttribute('aria-label')).toBe('Hit Points');
    expect(part(root, 'dialog').textContent).toContain('Damage or heal');
    expect(calls).toStrictEqual(['showModal']);
  });

  it('closes from the close button', async () => {
    const root = await render(true);

    part(root, 'button').click();
    await settle();

    expect(root.querySelector('dialog')).toBeNull();
  });

  it('closes on cancel, which Escape fires, instead of leaving the dialog to close alone', async () => {
    const root = await render(true);
    const cancel = new Event('cancel', { cancelable: true });

    part(root, 'dialog').dispatchEvent(cancel);
    await settle();

    expect(cancel.defaultPrevented).toBe(true);
    expect(root.querySelector('dialog')).toBeNull();
  });
});
