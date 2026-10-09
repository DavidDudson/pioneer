import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ImageAspect, ImageDisplay, ImageFit, ImageLoading, ImageSize } from './image.component';

const PORTRAIT = 'https://example.test/portrait.webp';

interface Rendered {
  readonly fixture: ComponentFixture<ImageDisplay>;
  readonly frame: HTMLSpanElement;
  readonly img: HTMLImageElement;
}

async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const fixture = TestBed.createComponent(ImageDisplay);
  for (const [name, value] of Object.entries({ src: PORTRAIT, ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const frame = host.querySelector('span');
  const img = host.querySelector('img');
  if (frame === null || img === null) {
    throw new Error('fr-image rendered no frame or <img>');
  }
  return { fixture, frame, img };
}

async function fire(rendered: Rendered, type: 'load' | 'error'): Promise<void> {
  rendered.img.dispatchEvent(new Event(type));
  await rendered.fixture.whenStable();
}

describe(ImageDisplay, () => {
  it('describes the image with its alt text and loads lazily by default', async () => {
    const { img } = await render({ alt: 'Seelah in her armour' });
    expect(img.getAttribute('src')).toBe(PORTRAIT);
    expect(img.alt).toBe('Seelah in her armour');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('loads at once when eager', async () => {
    const { img } = await render({ alt: 'Map', loading: ImageLoading.Eager });
    expect(img.getAttribute('loading')).toBe('eager');
  });

  it('gives a decorative image an empty alt', async () => {
    const { img } = await render({ alt: '', decorative: true });
    expect(img.getAttribute('alt')).toBe('');
  });

  it('refuses a missing description', async () => {
    await expect(render({ alt: '  ' })).rejects.toThrow(/alt is required/u);
  });

  it('refuses a description on a decorative image', async () => {
    await expect(render({ alt: 'Logo', decorative: true })).rejects.toThrow(/decorative image has alt=""/u);
  });

  it.each([
    [ImageSize.Sm, 'w-image-sm'],
    [ImageSize.Md, 'w-image-md'],
    [ImageSize.Lg, 'w-image-lg'],
    [ImageSize.Full, 'w-full'],
  ])('sizes the %s frame from a token', async (size, width) => {
    const { frame } = await render({ alt: 'Art', size });
    expect(frame.classList).toContain(width);
  });

  it.each([
    [ImageAspect.Square, 'aspect-square'],
    [ImageAspect.Portrait, 'aspect-portrait'],
    [ImageAspect.Landscape, 'aspect-landscape'],
    [ImageAspect.Wide, 'aspect-wide'],
  ])('shapes the %s frame from a token', async (aspect, shape) => {
    const { frame } = await render({ alt: 'Art', aspect });
    expect(frame.classList).toContain(shape);
  });

  it.each([
    [ImageFit.Cover, 'object-cover'],
    [ImageFit.Contain, 'object-contain'],
  ])('fits the image with %s', async (fit, objectFit) => {
    const { img } = await render({ alt: 'Art', fit });
    expect(img.classList).toContain(objectFit);
  });

  it('shimmers until the image loads', async () => {
    const rendered = await render({ alt: 'Art' });
    expect(rendered.frame.classList).toContain('animate-shimmer');
    await fire(rendered, 'load');
    expect(rendered.frame.classList).not.toContain('animate-shimmer');
    expect(rendered.frame.classList).not.toContain('bg-surface-skeleton');
  });

  it('stops shimmering and reports a failed image', async () => {
    const rendered = await render({ alt: 'Art' });
    let failures = 0;
    rendered.fixture.componentInstance.failed.subscribe(() => {
      failures += 1;
    });
    await fire(rendered, 'error');
    expect(failures).toBe(1);
    expect(rendered.frame.classList).not.toContain('animate-shimmer');
    expect(rendered.frame.classList).toContain('bg-surface-sunken');
    expect(rendered.img.alt).toBe('Art');
  });

  it('shimmers again for a new source', async () => {
    const rendered = await render({ alt: 'Art' });
    await fire(rendered, 'load');
    rendered.fixture.componentRef.setInput('src', 'https://example.test/other.webp');
    await rendered.fixture.whenStable();
    expect(rendered.frame.classList).toContain('animate-shimmer');
  });
});
