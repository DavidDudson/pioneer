import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Button, ButtonVariant, LocaleFormat, Size, Text } from '@pioneer/frontier';
import { InlineKind } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { INLINE_ROLLER } from '../inline-roller';
import { RICH_TEXT_LINKS } from '../rich-text-links';
import { RichTextMessage } from '../rich-text-messages';
import { statisticName, valueText } from './value-text';
import type { ValueNode, ValueTextContext } from './value-text';

/** What pressing a rolled value does, and the name a screen reader gives the button. */
interface ValueRoll {
  readonly name: string;
  readonly run: () => void | Promise<void>;
}

/**
 * A check, damage, area or duration inside text, set off so it reads as something to roll or measure. Where the page
 * provides an `INLINE_ROLLER`, a check or damage is a button that rolls it; a check the reader has no statistic for
 * stays text, with the reason beside it.
 */
@Component({
  selector: 'pio-rich-value',
  imports: [Button, Text],
  templateUrl: './rich-value.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichValue {
  public readonly node = input.required<ValueNode>();

  readonly #links = inject(RICH_TEXT_LINKS);
  readonly #format = inject(LocaleFormat);
  readonly #roller = inject(INLINE_ROLLER, { optional: true });
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly outline = ButtonVariant.OutlineSubtle;
  protected readonly small = Size.Sm;

  /** The author's own wording if the node gives one, else the generated text. */
  protected readonly text = computed((): string => {
    const node = this.node();
    if ('label' in node && node.label !== undefined) {
      return node.label;
    }
    this.#messages();
    return valueText(node, this.#context());
  });

  /** What pressing the text rolls; unset where the text is not rollable here. */
  protected readonly roll = computed((): ValueRoll | undefined => {
    const node = this.node();
    const roller = this.#roller;
    if (roller === null) {
      return undefined;
    }
    const label = this.text();
    const name = this.#i18n.translate(RichTextMessage.Roll, { text: label });
    if (node.type === InlineKind.Damage) {
      return {
        name,
        run: (): void | Promise<void> => roller.damage({ node, label }),
      };
    }
    if (node.type === InlineKind.Check && roller.hasStatistic(node.statistic)) {
      return {
        name,
        run: (): void => {
          roller.check({ node, label });
        },
      };
    }
    return undefined;
  });

  /** Why a check cannot be rolled here; unset for any other text. */
  protected readonly missing = computed((): string | undefined => {
    const node = this.node();
    if (node.type !== InlineKind.Check || this.#roller === null || this.#roller.hasStatistic(node.statistic)) {
      return undefined;
    }
    this.#messages();
    return this.#i18n.translate(RichTextMessage.NoStatistic, {
      statistic: statisticName(node.statistic, this.#context()),
    });
  });

  #context(): ValueTextContext {
    return {
      links: this.#links,
      format: this.#format,
      translate: (key, params) => this.#i18n.translate(key, params),
    };
  }
}
