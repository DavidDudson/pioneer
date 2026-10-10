import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { cva } from 'class-variance-authority';

import { textVariants } from '../../text/text.variants';
import type { TextVariant } from '../../text/text.variants';

const linkVariants = cva(
  'text-accent-fg underline underline-offset-link hover:decoration-accent-fg focus-visible:focus-ring',
  {
    variants: {
      // The page being shown: the underline turns accent and thickens, so the cue is not colour alone.
      current: { true: 'decoration-accent-fg decoration-link-current', false: 'decoration-line-strong' },
    },
  },
);

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

  private readonly document = inject(DOCUMENT);

  /** Whether `to` is the page being shown; routerLinkActive keeps it up to date. */
  protected readonly current = signal(false);
  protected readonly activeOptions = computed(() => ({ exact: this.exact() }));

  protected readonly externalUrl = computed((): string | undefined => {
    const url = this.external();
    return url !== undefined && EXTERNAL_URL.test(url) ? url : undefined;
  });

  protected readonly classes = computed(() => {
    const variant = this.variant();
    const link = linkVariants({ current: this.current() });
    return variant === undefined ? link : `${link} ${textVariants({ variant })}`;
  });

  /** Focuses the `skipTo` element in place of following `#id`, which would load `/#id`. */
  protected skip(event: Event, id: string): void {
    event.preventDefault();
    this.document.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus();
  }
}
