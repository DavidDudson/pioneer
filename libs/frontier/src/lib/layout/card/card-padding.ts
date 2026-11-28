import { computed, inject, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import { Space } from '../../tokens';

/** Padding a part takes when it is not inside an `fr-card`. */
const DEFAULT_CARD_PADDING: Space = Space.Lg;

/** Lends parts the card's padding token so header, content and footer line up. */
@Injectable()
export class CardContext {
  private readonly source = signal<Signal<Space>>(signal<Space>(DEFAULT_CARD_PADDING).asReadonly());

  public attach(padding: Signal<Space>): void {
    this.source.set(padding);
  }

  public padding(): Space {
    return this.source()();
  }
}

/** The padding a part applies: its card's token, or `DEFAULT_CARD_PADDING` outside a card. */
export function injectCardPadding(): Signal<Space> {
  const context = inject(CardContext, { optional: true });

  return computed(() => context?.padding() ?? DEFAULT_CARD_PADDING);
}
