import { ApplicationRef, createComponent, EnvironmentInjector, signal } from '@angular/core';
import type { ComponentRef, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as z from 'zod';

import { TextInput } from '../../controls/text-input/text-input.component';
import { projectBySelector } from '../../testing/project-by-selector';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { toneVariants } from '../../tokens';
import { InlineEdit, InlineEditStatus } from '../inline-edit';
import { InlineField } from './inline-field.component';

class ConflictError extends Error {
  public override readonly name = 'ConflictError';
}

interface Rendered {
  readonly host: HTMLElement;
  readonly edit: InlineEdit<string>;
  readonly source: WritableSignal<string | undefined>;
  readonly save: Mock<(value: string) => Promise<void>>;
  readonly stable: () => Promise<void>;
}

interface Options {
  /** No server value yet. */
  readonly loading?: boolean;
  /** What a save does; defaults to storing the value like the server would. */
  readonly save?: (value: string) => Promise<void>;
}

/**
 * Renders `fr-inline-field` labelled "Name" with an `fr-text-input` editor wired to the edit the way the
 * component's docs show, in the document so focus moves.
 */
async function render({ loading = false, save }: Options = {}): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const environmentInjector = TestBed.inject(EnvironmentInjector);
  const appRef = TestBed.inject(ApplicationRef);
  const source = signal<string | undefined>(loading ? undefined : 'Valeros');
  const saveMock = vi.fn<(value: string) => Promise<void>>(
    save ??
      (async (value): Promise<void> => {
        source.set(value);
      }),
  );
  const edit = new InlineEdit<string>({
    source,
    empty: '',
    schema: z.string().trim().min(1),
    save: saveMock,
    isConflict: (error): boolean => error instanceof ConflictError,
  });

  const editor: ComponentRef<TextInput> = createComponent(TextInput, { environmentInjector });
  const editorHost = editor.location.nativeElement as HTMLElement;
  editorHost.setAttribute('frInlineEditor', '');
  editor.setInput('ariaLabel', 'Name');
  editor.setInput('value', edit.draft());
  editor.instance.value.subscribe((value) => {
    edit.change(value);
  });
  editor.instance.committed.subscribe(() => {
    edit.flushSoon();
  });
  editor.instance.cancelled.subscribe(() => {
    edit.cancel();
  });

  const field = createComponent(InlineField<string>, {
    environmentInjector,
    projectableNodes: projectBySelector(InlineField, [editorHost]),
  });
  field.setInput('label', 'Name');
  field.setInput('edit', edit);
  const host = field.location.nativeElement as HTMLElement;
  document.body.append(host);
  appRef.attachView(editor.hostView);
  appRef.attachView(field.hostView);
  onTestFinished(() => {
    field.destroy();
    editor.destroy();
    host.remove();
  });
  const stable = async (): Promise<void> => {
    await appRef.whenStable();
  };
  await stable();
  return { host, edit, source, save: saveMock, stable };
}

function readButton(rendered: Rendered): HTMLButtonElement | null {
  return rendered.host.querySelector('button[aria-label^="Edit"]');
}

function editorInput(rendered: Rendered): HTMLInputElement | null {
  return rendered.host.querySelector('[frInlineEditor] input');
}

async function open(rendered: Rendered): Promise<HTMLInputElement> {
  readButton(rendered)?.click();
  await rendered.stable();
  const input = editorInput(rendered);
  if (input === null) {
    throw new Error('Expected the editor to open');
  }
  return input;
}

async function type(rendered: Rendered, input: HTMLInputElement, text: string): Promise<void> {
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await rendered.stable();
}

async function press(rendered: Rendered, input: HTMLInputElement, key: 'Enter' | 'Escape'): Promise<void> {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await rendered.edit.settled();
  await rendered.stable();
}

function revertButton(rendered: Rendered): HTMLButtonElement {
  const button = [...rendered.host.querySelectorAll('button')].find(
    (element) => element.textContent.trim() === 'Revert',
  );
  if (button === undefined) {
    throw new Error('Expected Revert');
  }
  return button;
}

function alertText(rendered: Rendered): string | undefined {
  return rendered.host.querySelector('[role="alert"]')?.textContent.trim();
}

describe(InlineField, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the label and a skeleton while the value loads, and cannot be opened', async () => {
    const rendered = await render({ loading: true });
    expect(rendered.host.textContent.trim()).toBe('Name');
    expect(rendered.host.querySelector('fr-skeleton')).not.toBeNull();
    expect(rendered.host.querySelector('button')).toBeNull();
    expect(editorInput(rendered)).toBeNull();
  });

  it('shows the value as a button named for editing it, with the editor not rendered', async () => {
    const rendered = await render();
    expect(readButton(rendered)?.textContent.trim()).toBe('Valeros');
    expect(readButton(rendered)?.getAttribute('aria-label')).toBe('Edit Name: Valeros');
    expect(editorInput(rendered)).toBeNull();
  });

  it('swaps the read view for the projected editor on a press, and focuses it', async () => {
    const rendered = await render();
    const input = await open(rendered);
    expect(readButton(rendered)).toBeNull();
    expect(input.value).toBe('Valeros');
    expect(document.activeElement).toBe(input);
  });

  it('saves a typed change at once on Enter, then shows it saved', async () => {
    const rendered = await render();
    const input = await open(rendered);
    await type(rendered, input, 'Seelah');
    await press(rendered, input, 'Enter');
    expect(rendered.save).toHaveBeenCalledExactlyOnceWith('Seelah');
    expect(rendered.edit.status()).toBe(InlineEditStatus.Success);
    expect(rendered.host.querySelector('[role="status"]')?.textContent.trim()).toBe('Saved');
  });

  it('drops an unsaved change on Escape and goes back to the read view', async () => {
    const rendered = await render();
    const input = await open(rendered);
    await type(rendered, input, 'Seelah');
    await press(rendered, input, 'Escape');
    expect(rendered.save).not.toHaveBeenCalled();
    expect(editorInput(rendered)).toBeNull();
    expect(readButton(rendered)?.textContent.trim()).toBe('Valeros');
  });

  it('saves and closes when focus leaves the field', async () => {
    const rendered = await render();
    const input = await open(rendered);
    await type(rendered, input, 'Seelah');
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    await rendered.edit.settled();
    await rendered.stable();
    expect(rendered.save).toHaveBeenCalledExactlyOnceWith('Seelah');
    expect(readButton(rendered)?.textContent.trim()).toBe('Seelah');
  });

  it('stays open when focus moves to Revert, inside the field', async () => {
    const rendered = await render();
    const input = await open(rendered);
    await type(rendered, input, 'Seelah');
    await press(rendered, input, 'Enter');
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: revertButton(rendered) }));
    await rendered.stable();
    expect(rendered.edit.open()).toBe(true);
    expect(editorInput(rendered)).not.toBeNull();
  });

  it('shows a validation problem inline and keeps an invalid draft open and unsaved', async () => {
    const rendered = await render();
    const input = await open(rendered);
    await type(rendered, input, ' ');
    expect(alertText(rendered)).not.toBe('');
    expect(rendered.host.querySelector('[role="alert"]')?.classList).toContain(toneVariants.danger);
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    await press(rendered, input, 'Enter');
    expect(rendered.save).not.toHaveBeenCalled();
    expect(editorInput(rendered)).not.toBeNull();
  });

  it('reports a failed save inline as a problem', async () => {
    const rendered = await render({
      save: async () => {
        throw new Error('Offline');
      },
    });
    const input = await open(rendered);
    await type(rendered, input, 'Seelah');
    await press(rendered, input, 'Enter');
    expect(alertText(rendered)).toBe('Could not save. Try again.');
    expect(rendered.host.querySelector('[role="alert"]')?.classList).toContain(toneVariants.danger);
  });

  it('reports a conflict inline as a warning', async () => {
    const rendered = await render({
      save: async () => {
        throw new ConflictError();
      },
    });
    const input = await open(rendered);
    await type(rendered, input, 'Seelah');
    await press(rendered, input, 'Enter');
    expect(alertText(rendered)).toBe('Changed elsewhere. Showing the latest version.');
    expect(rendered.host.querySelector('[role="alert"]')?.classList).toContain(toneVariants.warning);
  });

  it('is busy while a save is in flight', async () => {
    const gate = Promise.withResolvers<undefined>();
    const rendered = await render({
      save: async (value) => {
        await gate.promise;
        rendered.source.set(value);
      },
    });
    const input = await open(rendered);
    await type(rendered, input, 'Seelah');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await rendered.stable();
    expect(rendered.host.getAttribute('aria-busy')).toBe('true');
    gate.resolve(undefined);
    await rendered.edit.settled();
    await rendered.stable();
    expect(rendered.host.hasAttribute('aria-busy')).toBe(false);
  });
});
