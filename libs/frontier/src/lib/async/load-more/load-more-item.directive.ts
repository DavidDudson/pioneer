import { Directive, ElementRef, inject } from '@angular/core';

/**
 * One item of an `fr-load-more` list: where focus lands when it is the first
 * item of a newly loaded page. Focusable from script only (`tabindex="-1"`),
 * so it adds no tab stop.
 *
 * ```html
 * <fr-list-item frLoadMoreItem>…</fr-list-item>
 * ```
 */
@Directive({
  selector: '[frLoadMoreItem]',
  host: { tabindex: '-1', class: 'focus-visible:focus-ring' },
})
export class LoadMoreItem {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  public focus(): void {
    this.#host.nativeElement.focus();
  }
}
