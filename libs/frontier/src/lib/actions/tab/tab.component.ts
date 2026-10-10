import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { RovingFocusItem } from '../../focus/roving-focus-item.directive';
import { Link, LinkAppearance } from '../link/link.component';
import type { LinkTarget } from '../link/link.component';

/**
 * One tab of `fr-tabs`: a router link to a section's own route, marked `aria-current="page"` and underlined while
 * that route is shown. While focus is outside the tabs, the current tab is their one Tab stop.
 */
@Component({
  selector: 'fr-tab',
  imports: [Link],
  templateUrl: './tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  hostDirectives: [RovingFocusItem],
})
export class Tab {
  public readonly to = input.required<LinkTarget>();
  /** Only the `to` route itself is current, not the routes under it; for a tab whose route is the others' parent. */
  public readonly exact = input(false, { transform: booleanAttribute });

  protected readonly appearance = LinkAppearance.Tab;

  private readonly link = viewChild(Link);
  readonly #item = inject(RovingFocusItem, { self: true });

  /** Whether this tab's route is the one shown. */
  public readonly current = computed(() => this.link()?.current() ?? false);

  public constructor() {
    this.#item.followSelected(this.current);
  }

  /** The tab's link element. */
  public target(): HTMLElement {
    return this.#item.target();
  }
}
