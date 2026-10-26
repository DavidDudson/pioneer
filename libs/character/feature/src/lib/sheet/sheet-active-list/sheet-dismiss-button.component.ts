import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, HoverCard, HoverCardContent } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';
import { RichTextView } from '@pioneer/rules/ui';

/**
 * The Dismiss button of an active spell or effect. A spell that ends early under a condition of its own (a free
 * action or reaction with a trigger) gives that `note`, which shows beside the button while it is hovered or focused.
 */
@Component({
  selector: 'pio-sheet-dismiss-button',
  imports: [AsyncButton, HoverCard, HoverCardContent, NgTemplateOutlet, RichTextView, TranslocoPipe],
  templateUrl: './sheet-dismiss-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetDismissButton {
  public readonly action = input.required<() => Promise<unknown>>();
  public readonly disabled = input(false);
  public readonly describeError = input.required<(error: unknown) => string>();
  public readonly note = input<RichText | undefined>(undefined);
}
