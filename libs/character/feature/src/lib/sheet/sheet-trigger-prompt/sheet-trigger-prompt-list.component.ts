import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, BadgeTone, Button, Stack, Text } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import { UseButtons } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { TriggerPromptRow } from './trigger-prompt-view';

/** The abilities an event fired, each with its cost, uses left, a Use button and a Decline. */
@Component({
  selector: 'pio-sheet-trigger-prompt-list',
  imports: [Badge, Button, Stack, Text, TranslocoPipe, UseButtons],
  templateUrl: './sheet-trigger-prompt-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTriggerPromptList {
  readonly #i18n = inject(TranslocoService);

  /** The abilities to offer. */
  public readonly rows = input.required<ReadonlyArray<TriggerPromptRow>>();
  /** An ability the player declined. */
  public readonly declined = output<ContentId>();

  protected readonly badgeTone = BadgeTone;

  /** The words of a reason an ability can't be used now. */
  protected readonly reasonOf = ({ key, params }: MessageDescriptor): string => this.#i18n.translate(key, params);
}
