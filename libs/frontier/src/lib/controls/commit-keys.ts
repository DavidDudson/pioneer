import type { ElementRef, Signal } from '@angular/core';
import { injectHotkey } from '@tanstack/angular-hotkeys';
import type { InjectHotkeyOptions } from '@tanstack/angular-hotkeys';

/**
 * Enter commits and Escape cancels, scoped to one control element (TanStack
 * Hotkeys). Enter keeps its default so a control inside a form still submits
 * it. Call in an injection context.
 */
export function injectCommitKeys(
  element: Signal<ElementRef<HTMLElement> | undefined>,
  handlers: { readonly commit: () => void; readonly cancel: () => void },
): void {
  const scoped = (preventDefault: boolean) => (): InjectHotkeyOptions => {
    const target = element()?.nativeElement;
    return target === undefined
      ? { enabled: false }
      : { target, ignoreInputs: false, preventDefault, stopPropagation: false, conflictBehavior: 'allow' };
  };
  injectHotkey('Enter', handlers.commit, scoped(false));
  injectHotkey('Escape', handlers.cancel, scoped(true));
}
