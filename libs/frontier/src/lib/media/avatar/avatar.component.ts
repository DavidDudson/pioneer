import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { cva } from 'class-variance-authority';

import { LocaleFormat } from '../../locale/locale-format';
import { Size } from '../../tokens';
import { ImageAspect, ImageDisplay, ImageSize } from '../image/image.component';

/** A square of the avatar size; the initials' type scales with it. */
const avatarVariants = cva('block shrink-0', {
  variants: {
    size: { sm: 'size-avatar-sm', md: 'size-avatar-md', lg: 'size-avatar-lg' } satisfies Record<Size, string>,
  },
});

const initialsVariants = cva(
  'flex size-full items-center justify-center border border-accent-line bg-accent-subtle font-semibold text-accent-fg',
  {
    variants: {
      size: { sm: 'text-caption', md: 'text-label', lg: 'text-subheading' } satisfies Record<Size, string>,
    },
  },
);

/**
 * A character's or account's picture: a square `fr-image`, sharp like everything else. Without a `src`, or when
 * the image fails, it shows up to two initials from `name`, segmented in the active locale (`LocaleFormat`). The
 * accessible name is `name`; mark it `decorative` when the name is already written beside it.
 *
 * ```html
 * <fr-avatar [name]="name()" [src]="portraitUrl()" size="lg" />
 * ```
 */
@Component({
  selector: 'fr-avatar',
  imports: [ImageDisplay],
  templateUrl: './avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Avatar {
  readonly #format = inject(LocaleFormat);

  /** Whose avatar this is: the accessible name and the source of the initials. */
  public readonly name = input.required<string>();
  public readonly src = input<string | undefined>(undefined);
  public readonly size = input<Size>(Size.Md);
  /** The name is written beside the avatar: hide it from screen readers. */
  public readonly decorative = input(false, { transform: booleanAttribute });

  /** The image failed; cleared when `src` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.src,
    computation: () => false,
  });

  protected readonly showImage = computed(() => this.src() !== undefined && !this.failed());
  protected readonly initials = computed(() => this.#format.initials(this.name()));
  /** The accessible name. A blank name (a display name not yet loaded) leaves the avatar decorative. */
  protected readonly label = computed(() => {
    const name = this.name().trim();
    return this.decorative() || name === '' ? undefined : name;
  });
  protected readonly imageDecorative = computed(() => this.label() === undefined);
  protected readonly imageAlt = computed(() => this.label() ?? '');
  protected readonly classes = computed(() => avatarVariants({ size: this.size() }));
  protected readonly initialsClasses = computed(() => initialsVariants({ size: this.size() }));

  protected readonly imageSize = ImageSize.Full;
  protected readonly imageAspect = ImageAspect.Square;

  protected onImageFailed(): void {
    this.failed.set(true);
  }
}
