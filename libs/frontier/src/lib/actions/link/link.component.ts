import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cva } from 'class-variance-authority';

import { textVariants } from '../../text/text.variants';
import type { TextVariant } from '../../text/text.variants';

const linkVariants = cva(
  'text-accent-fg underline decoration-line-strong underline-offset-link hover:decoration-accent-fg focus-visible:focus-ring',
);

/** Router commands, as `routerLink` takes them. */
export type LinkTarget = string | readonly unknown[];

/** URLs that leave the app, so a document load is expected (the same test lint applies to a literal `href`). */
const EXTERNAL_URL = /^https?:/u;

/**
 * A link. `to` navigates in the app through the router (no page load);
 * `href` is only for other sites and is checked by lint. `external` is
 * another site's URL that comes from data (a source's web page): it links
 * only when it is `http:` or `https:`, and otherwise shows its content as
 * plain text, so data can never reload the app.
 *
 * ```html
 * <fr-link [to]="[character.id]" variant="subheading">{{ character.name }}</fr-link>
 * <fr-link href="https://paizo.com">paizo.com</fr-link>
 * <fr-link [external]="source.url" [ariaLabel]="'source.webLabel' | transloco">{{ source.title }}</fr-link>
 * ```
 */
@Component({
  selector: 'fr-link',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './link.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Link {
  public readonly to = input<LinkTarget | undefined>(undefined);
  public readonly href = input<string | undefined>(undefined);
  /** Another site's URL from data. Only `http:` and `https:` link; anything else renders as text. */
  public readonly external = input<string | undefined>(undefined);
  /**
   * The link's accessible name, already translated, when its text alone is too short ("AoN"). Start it with the
   * visible text ("AoN: Player Core page 46 on Archives of Nethys"): axe's label-in-name check fails otherwise.
   */
  public readonly ariaLabel = input<string | undefined>(undefined);
  /** Typography when the link stands alone; inside text it inherits. */
  public readonly variant = input<TextVariant | undefined>(undefined);

  protected readonly externalUrl = computed((): string | undefined => {
    const url = this.external();
    return url !== undefined && EXTERNAL_URL.test(url) ? url : undefined;
  });

  protected readonly classes = computed(() => {
    const variant = this.variant();
    return variant === undefined ? linkVariants() : `${linkVariants()} ${textVariants({ variant })}`;
  });
}
