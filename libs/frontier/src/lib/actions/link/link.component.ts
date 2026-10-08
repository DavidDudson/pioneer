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

/**
 * A link. `to` navigates in the app through the router (no page load);
 * `href` is only for other sites and is checked by lint.
 *
 * ```html
 * <fr-link [to]="[character.id]" variant="subheading">{{ character.name }}</fr-link>
 * <fr-link href="https://paizo.com">paizo.com</fr-link>
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
  /** Typography when the link stands alone; inside text it inherits. */
  public readonly variant = input<TextVariant | undefined>(undefined);

  protected readonly classes = computed(() => {
    const variant = this.variant();
    return variant === undefined ? linkVariants() : `${linkVariants()} ${textVariants({ variant })}`;
  });
}
