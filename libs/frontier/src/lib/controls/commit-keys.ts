import type { ElementRef, Signal } from '@angular/core';
import { injectHotkey } from '@tanstack/angular-hotkeys';
import type { InjectHotkeyOptions } from '@tanstack/angular-hotkeys';

/** The `keyCode` browsers report for a key an input method editor (IME) handles, as Safari does for the Enter that ends a composition. */
const IME_KEY_CODE = 229;

/**
 * Whether the key belongs to an IME composition: Enter that picks a candidate, or Escape that abandons one, is not
 * a commit or a cancel. TanStack Hotkeys already skips printable keys while composing, not Enter or Escape.
 */
export function isComposingKey(event: KeyboardEvent): boolean {
  // oxlint-disable-next-line typescript/no-deprecated -- keyCode 229 is the only IME signal Safari gives on the Enter after compositionend
  return event.isComposing || event.key === 'Process' || event.keyCode === IME_KEY_CODE;
}

/**
 * Enter commits and Escape cancels, scoped to one control element (TanStack
 * Hotkeys). Enter keeps its default so a control inside a form still submits
 * it; Escape does not. Neither fires while an IME is composing (`isComposingKey`). Call in an
 * injection context.
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
