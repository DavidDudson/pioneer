import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

/** Width of the image. The height follows `aspect`. `full` fills its parent, as `fr-avatar` does. */
export const ImageSize = { Sm: 'sm', Md: 'md', Lg: 'lg', Full: 'full' } as const;
export type ImageSize = ValueOf<typeof ImageSize>;

export const ImageAspect = {
  Square: 'square',
  /** 3:4, for character portraits. */
  Portrait: 'portrait',
  /** 4:3, for content art. */
  Landscape: 'landscape',
  /** 16:9, for banners. */
  Wide: 'wide',
} as const;
export type ImageAspect = ValueOf<typeof ImageAspect>;

export const ImageFit = {
  /** Fill the frame and crop the overflow. Portraits and art. */
  Cover: 'cover',
  /** Show the whole image inside the frame. Logos. */
  Contain: 'contain',
} as const;
export type ImageFit = ValueOf<typeof ImageFit>;

export const ImageLoading = {
  /** Load when the image nears the viewport. The default. */
  Lazy: 'lazy',
  /** Load at once, for an image visible on first paint. */
  Eager: 'eager',
} as const;
export type ImageLoading = ValueOf<typeof ImageLoading>;

const ImageStatus = { Loading: 'loading', Loaded: 'loaded', Failed: 'failed' } as const;
type ImageStatus = ValueOf<typeof ImageStatus>;

/** The frame holds the size before the image arrives, so nothing shifts, and shimmers like `fr-skeleton`. */
const frameVariants = cva('block shrink-0 overflow-hidden', {
  variants: {
    size: {
      sm: 'w-image-sm',
      md: 'w-image-md',
      lg: 'w-image-lg',
      full: 'w-full',
    } satisfies Record<ImageSize, string>,
    aspect: {
      square: 'aspect-square',
      portrait: 'aspect-portrait',
      landscape: 'aspect-landscape',
      wide: 'aspect-wide',
    } satisfies Record<ImageAspect, string>,
    status: {
      loading: 'animate-shimmer bg-surface-skeleton',
      loaded: '',
      failed: 'bg-surface-sunken text-caption text-fg-muted',
    } satisfies Record<ImageStatus, string>,
  },
});

const imageVariants = cva('block size-full', {
  variants: {
    fit: { cover: 'object-cover', contain: 'object-contain' } satisfies Record<ImageFit, string>,
  },
});

/**
 * An image: a character portrait, content art or a sign-in provider's logo, and the only owner of `<img>`.
 * `alt` is required and says what the image shows; an image that adds nothing to the text beside it is
 * `decorative` with `alt=""`, and screen readers skip it. Loads lazily unless `loading="eager"`. The frame takes
 * its width and shape from tokens and shimmers until the image arrives; if it fails, the alt text shows in its
 * place and `failed` fires.
 *
 * ```html
 * <fr-image [src]="portraitUrl()" [alt]="portraitAlt()" aspect="portrait" size="lg" />
 * <fr-image [src]="logoUrl()" alt="" decorative fit="contain" size="sm" />
 * ```
 */
@Component({
  selector: 'fr-image',
  templateUrl: './image.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ImageDisplay {
  public readonly src = input.required<string>();
  /** What the image shows. Empty only when `decorative`. */
  public readonly alt = input.required<string>();
  /** Adds nothing the surrounding text does not say: hidden from screen readers, with `alt=""`. */
  public readonly decorative = input(false, { transform: booleanAttribute });
  public readonly size = input<ImageSize>(ImageSize.Md);
  public readonly aspect = input<ImageAspect>(ImageAspect.Square);
  public readonly fit = input<ImageFit>(ImageFit.Cover);
  public readonly loading = input<ImageLoading>(ImageLoading.Lazy);

  /** The image could not be loaded. Fires again for each `src` that fails. */
  public readonly failed = output();

  /** Back to loading whenever `src` changes. */
  protected readonly status = linkedSignal<string, ImageStatus>({
    source: this.src,
    computation: () => ImageStatus.Loading,
  });

  protected readonly altText = computed(() => {
    const alt = this.alt().trim();
    if (this.decorative() && alt !== '') {
      throw new Error('fr-image: a decorative image has alt="".');
    }
    if (!this.decorative() && alt === '') {
      throw new Error('fr-image: alt is required. Describe the image, or mark it decorative.');
    }
    return alt;
  });

  protected readonly frameClasses = computed(() =>
    frameVariants({ size: this.size(), aspect: this.aspect(), status: this.status() }),
  );
  protected readonly imageClasses = computed(() => imageVariants({ fit: this.fit() }));

  protected onLoad(): void {
    this.status.set(ImageStatus.Loaded);
  }

  protected onError(): void {
    this.status.set(ImageStatus.Failed);
    this.failed.emit();
  }
}
