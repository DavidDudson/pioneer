import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { Params } from '@angular/router';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { textVariants } from '../../text/text.variants';
import type { TextVariant } from '../../text/text.variants';

export const LinkAppearance = {
  /** A link in text or standing alone: accent text, always underlined. */
  Inline: 'inline',
  /** One tab of `fr-tabs`: a touch-sized label, underlined only when current. Features use `fr-tab`. */
  Tab: 'tab',
  /** One tab of `fr-tabs` in its segment look: a button in a track, filled with the accent while current. Features use `fr-tab`. */
  Segment: 'segment',
  /** One link of `fr-section-index`: inline-link look at touch height. Features use `fr-section-link`. */
  Index: 'index',
  /** One row of a menu or dropdown panel: looks like `fr-button` variant `menu`, with the current page filled. */
  Menu: 'menu',
} as const;
export type LinkAppearance = ValueOf<typeof LinkAppearance>;

const linkVariants = cva('focus-visible:focus-ring', {
  variants: {
    appearance: {
      inline: 'text-accent-fg underline underline-offset-link hover:decoration-accent-fg',
      // Touch-sized; a tab's label never wraps, the tab row scrolls instead.
      tab: 'inline-flex h-touch items-center px-sm text-label font-medium whitespace-nowrap underline-offset-link pointer-fine:h-control-sm',
      // Touch-sized like a tab, but reads as a link: the index wraps instead of scrolling.
      index:
        'inline-flex h-touch items-center text-accent-fg underline decoration-line-strong underline-offset-link hover:decoration-accent-fg pointer-fine:h-control-sm',
      segment:
        'inline-flex h-touch items-center justify-center px-sm text-label font-medium whitespace-nowrap no-underline pointer-fine:h-control-sm',
      menu: 'flex h-touch w-full items-center gap-xs px-sm text-label font-medium text-fg-default hover:bg-surface-sunken pointer-fine:h-control-sm',
    } satisfies Record<LinkAppearance, string>,
    // The page being shown: the underline turns accent and thickens, so the cue is not colour alone.
    current: { true: 'decoration-accent-fg decoration-link-current', false: '' },
  },
  compoundVariants: [
    { appearance: 'inline', current: false, class: 'decoration-line-strong' },
    { appearance: 'tab', current: true, class: 'text-fg-default underline' },
    { appearance: 'menu', current: true, class: 'bg-accent-subtle text-accent-fg' },
    { appearance: 'segment', current: true, class: 'bg-accent-solid text-accent-on-solid hover:bg-accent-solid-hover' },
    { appearance: 'segment', current: false, class: 'text-fg-muted hover:bg-surface-sunken hover:text-fg-default' },
    {
      appearance: 'tab',
      current: false,
      class: 'text-fg-muted hover:text-fg-default hover:underline hover:decoration-line-strong',
    },
  ],
});

/** Router commands, as `routerLink` takes them. */
export type LinkTarget = string | readonly unknown[];

/**
 * Absolute URLs on another host, so a document load is expected. The `//` matters: `https:/characters` resolves
 * against the app's own origin. Schemes are case-insensitive.
 */
const EXTERNAL_URL = /^https?:\/\//iu;

/**
 * A link. `to` navigates in the app through the router (no page load);
 * `href` is only for other sites and is checked by lint. `external` is
 * another site's URL that comes from data: it links only when it is an
 * absolute `http(s)://` URL, and otherwise shows its content as plain text,
 * so data can never reload the app.
 *
 * `skipTo` is the id of an element on this page: following it moves focus there without navigating (a skip link).
 * A plain `href="#id"` can't: with `<base href="/">` it loads `/#id`.
 *
 * A `to` link to the page being shown is marked `aria-current="page"` and drawn as current. It matches any page under
 * its target; `exact` matches the target alone, for a root link that would otherwise match every page.
 *
 * ```html
 * <fr-link [to]="[character.id]" variant="subheading">{{ character.name }}</fr-link>
 * <fr-link to="/" exact>{{ 'shell.brand' | transloco }}</fr-link>
 * <fr-link href="https://paizo.com">paizo.com</fr-link>
 * <fr-link skipTo="results">{{ 'search.skipToResults' | transloco }}</fr-link>
 * <fr-link [external]="url" [ariaLabel]="'docs.linkLabel' | transloco">{{ 'docs.link' | transloco }}</fr-link>
 * ```
 */
@Component({
  selector: 'fr-link',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './link.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Link {
  public readonly to = input<LinkTarget | undefined>(undefined);
  /** Query parameters added to the `to` page's URL. */
  public readonly queryParams = input<Params | undefined>(undefined);
  /** History state the navigation carries, for the page it opens to read (where the link was followed from). */
  public readonly state = input<Readonly<Record<string, unknown>> | undefined>(undefined);
  /** Only the `to` page itself is current, not the pages under it. For a root link, which is under nothing. */
  public readonly exact = input(false, { transform: booleanAttribute });
  public readonly href = input<string | undefined>(undefined);
  /** Another site's URL from data. Only absolute `http(s)://` URLs link; anything else renders as text. */
  public readonly external = input<string | undefined>(undefined);
  /** The id of an element on this page to move focus to; give it `tabindex="-1"` unless it is focusable already. */
  public readonly skipTo = input<string | undefined>(undefined);
  /**
   * The link's accessible name, already translated, when its text alone is too short ("Docs"). Start it with the
   * visible text ("Docs: Angular documentation"): axe's label-in-name check fails otherwise.
   */
  public readonly ariaLabel = input<string | undefined>(undefined);
  /** Typography when the link stands alone; inside text it inherits. */
  public readonly variant = input<TextVariant | undefined>(undefined);
  /** `tab` is set by `fr-tab`; features use `fr-tabs` rather than a lone tab-styled link. */
  public readonly appearance = input<LinkAppearance>(LinkAppearance.Inline);

  private readonly document = inject(DOCUMENT);

  readonly #current = signal(false);
  /** Whether `to` is the page being shown; routerLinkActive keeps it up to date. */
  public readonly current = this.#current.asReadonly();
  protected readonly activeOptions = computed(() => ({ exact: this.exact() }));

  protected readonly externalUrl = computed((): string | undefined => {
    const url = this.external();
    return url !== undefined && EXTERNAL_URL.test(url) ? url : undefined;
  });

  protected readonly classes = computed(() => {
    const variant = this.variant();
    const link = linkVariants({ appearance: this.appearance(), current: this.current() });
    return variant === undefined ? link : `${link} ${textVariants({ variant })}`;
  });

  protected setCurrent(current: boolean): void {
    this.#current.set(current);
  }

  /** Focuses the `skipTo` element in place of following `#id`, which would load `/#id`. */
  protected skip(event: Event, id: string): void {
    event.preventDefault();
    this.document.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus();
  }
}
