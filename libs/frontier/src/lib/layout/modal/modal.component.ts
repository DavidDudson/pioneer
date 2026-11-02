import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, model, untracked, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideX } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Heading } from '../../text/heading/heading.component';
import { showDialog } from '../drawer/drawer-overlay';

const panelClasses = cva(
  'm-auto w-drawer-default max-w-full border border-line-default bg-surface-base p-md text-fg-default backdrop:bg-surface-overlay',
)();
const contentClasses = cva('flex flex-col gap-md')();
const headerClasses = cva('flex items-center justify-between gap-sm')();
const headingClasses = cva('min-w-none focus:outline-hidden')();

/**
 * A small modal `<dialog>` over the page: focus is trapped, Escape and the close button close it and the page behind
 * is inert. Frontier allows modals only where a page asks for one by name (the drawer below `lg` is the other); use it
 * for a short task that must finish before the page is used again, never for reading. Opening moves focus to the
 * title; closing returns it to what had focus when it opened. It renders nothing while closed.
 *
 * ```html
 * <fr-modal [(open)]="open" [title]="'hp.title' | transloco">…controls…</fr-modal>
 * ```
 */
@Component({
  selector: 'fr-modal',
  imports: [Button, Heading, Icon, TranslocoPipe],
  templateUrl: './modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Modal {
  /** Shown in the header and naming the dialog, already translated. */
  public readonly title = input.required<string>();
  public readonly open = model(false);

  protected readonly closeIcon = LucideX;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly panelClasses = panelClasses;
  protected readonly contentClasses = contentClasses;
  protected readonly headerClasses = headerClasses;
  protected readonly headingClasses = headingClasses;

  readonly #document = inject(DOCUMENT);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly panel = viewChild<ElementRef<HTMLDialogElement>>('panel');
  #opener: HTMLElement | undefined;
  #shown: HTMLDialogElement | undefined;

  public constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => {
        this.#remember(open);
      });
    });
    // Runs once the dialog exists: it is only in the page while open.
    effect(() => {
      const dialog = this.panel()?.nativeElement;
      untracked(() => {
        if (dialog === undefined) {
          this.#shown = undefined;
        } else if (this.#shown !== dialog) {
          this.#shown = dialog;
          showDialog(dialog, true);
          this.heading()?.nativeElement.focus();
        }
      });
    });
  }

  public close(): void {
    this.open.set(false);
  }

  /** Escape would only close the dialog; close the modal, so `open` and focus follow. */
  protected cancelFromDialog(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** Takes focus back to what had it when the modal opened. */
  #remember(open: boolean): void {
    const active = this.#document.activeElement;
    if (open) {
      this.#opener = active instanceof HTMLElement ? active : undefined;
      return;
    }
    const opener = this.#opener;
    this.#opener = undefined;
    opener?.focus();
  }
}
