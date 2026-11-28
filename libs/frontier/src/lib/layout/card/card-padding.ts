import { Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import { Space } from '../../tokens';

/** Padding a part takes when it is not inside an `fr-card`. */
export const DEFAULT_CARD_PADDING: Space = Space.Lg;

/**
 * What an `fr-card` lends its parts: the one padding token they read, so header, content and footer line up. The
 * card provides it and attaches its `padding` input as it is built, before any part reads it. Parts used outside a
 * card inject nothing and fall back to `DEFAULT_CARD_PADDING`.
 */
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
