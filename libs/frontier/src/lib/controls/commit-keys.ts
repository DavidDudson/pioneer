import type { ElementRef, Signal } from '@angular/core';
import { injectHotkey } from '@tanstack/angular-hotkeys';
import type { InjectHotkeyOptions } from '@tanstack/angular-hotkeys';

/** The `keyCode` Safari reports for the Enter that ends an IME composition. */
const IME_KEY_CODE = 229;

/** Enter or Escape during an IME composition is not a commit or a cancel; TanStack Hotkeys only skips printable keys. */
function isComposingKey(event: KeyboardEvent): boolean {
  // oxlint-disable-next-line typescript/no-deprecated -- keyCode 229 is the only IME signal Safari gives on the Enter after compositionend
  return event.isComposing || event.keyCode === IME_KEY_CODE;
}

/**
 * Enter commits and Escape cancels, scoped to one control element (TanStack
 * Hotkeys), except while an IME composes. Enter keeps its default so a control
 * inside a form still submits it. Call in an injection context.
 */
export function injectCommitKeys(
  element: Signal<ElementRef<HTMLElement> | undefined>,
  handlers: { readonly commit: () => void; readonly cancel: () => void },
): void {
  const scoped = (): InjectHotkeyOptions => {
    const target = element()?.nativeElement;

    return target === undefined
      ? { enabled: false }
      : { target, ignoreInputs: false, preventDefault: false, stopPropagation: false, conflictBehavior: 'allow' };
  };

  injectHotkey(
    'Enter',
    (event) => {
      if (!isComposingKey(event)) {
        handlers.commit();
      }
    },
    scoped,
  );
  injectHotkey(
    'Escape',
    (event) => {
      if (!isComposingKey(event)) {
        // Not through the hotkey option: it would also swallow the Escape an IME uses to abandon a composition.
        event.preventDefault();
        handlers.cancel();
      }
    },
    scoped,
  );
}
