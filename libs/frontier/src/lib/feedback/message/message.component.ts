import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { toneVariants } from '../../tokens';

export const MessageTone = { Danger: 'danger', Warning: 'warning', Success: 'success', Info: 'info' } as const;
export type MessageTone = ValueOf<typeof MessageTone>;

const messageVariants = cva('text-caption', {
  variants: {
    tone: {
      danger: toneVariants.danger,
      warning: toneVariants.warning,
      success: toneVariants.success,
      info: toneVariants.info,
    } satisfies Record<MessageTone, string>,
  },
});

/**
 * Inline feedback next to whatever caused it: never a toast. Problems are
 * announced assertively (`role="alert"`), confirmations politely.
 */
@Component({
  selector: 'fr-message',
  templateUrl: './message.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Message {
  public readonly tone = input<MessageTone>(MessageTone.Danger);
  /** Lets a control point `aria-describedby` at this message. */
  public readonly id = input<string | undefined>(undefined);

  protected readonly classes = computed(() => messageVariants({ tone: this.tone() }));
  protected readonly role = computed(() =>
    this.tone() === MessageTone.Danger || this.tone() === MessageTone.Warning ? 'alert' : 'status',
  );
}
