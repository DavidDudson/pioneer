import { DOCUMENT, inject, Injectable } from '@angular/core';
import { BodyFont, MonoFont } from '@pioneer/shared/kernel';

const GOOGLE_FONTS = 'https://fonts.googleapis.com/css2';
const GOOGLE_FONT_FILES = 'https://fonts.gstatic.com';
const FONTSOURCE = 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5';

/**
 * Where each face's stylesheet lives. Google's CSS API splits a face by `unicode-range`, so the browser downloads
 * only the pieces the page's text uses. Faces left out are the device's own (`System`) and need nothing.
 */
const BODY_STYLESHEETS: Readonly<Partial<Record<BodyFont, readonly string[]>>> = {
  [BodyFont.Thematic]: [`${GOOGLE_FONTS}?family=Crimson+Pro:ital,wght@0,400..700;1,400..700&display=swap`],
  [BodyFont.Readable]: [
    `${GOOGLE_FONTS}?family=Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800&display=swap`,
  ],
  [BodyFont.Lexend]: [`${GOOGLE_FONTS}?family=Lexend:wght@400..700&display=swap`],
  // OpenDyslexic is not on Google Fonts; Fontsource serves it from jsDelivr.
  [BodyFont.OpenDyslexic]: [`${FONTSOURCE}/400.css`, `${FONTSOURCE}/700.css`],
};

const MONO_STYLESHEETS: Readonly<Partial<Record<MonoFont, readonly string[]>>> = {
  [MonoFont.Standard]: [`${GOOGLE_FONTS}?family=Fira+Code:wght@400..700&display=swap`],
  [MonoFont.Typewriter]: [`${GOOGLE_FONTS}?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap`],
};

/** The wordmark only: `text=` asks for just the letters of "Pioneer", a few hundred bytes. */
const BRAND_STYLESHEET = `${GOOGLE_FONTS}?family=Pirata+One&text=Pioneer&display=swap`;

/**
 * Loads typeface stylesheets when a face is first shown, never twice. A failed or blocked request leaves the
 * fallback in the font stack showing, so text stays readable offline.
 */
@Injectable({ providedIn: 'root' })
export class FontStylesheets {
  readonly #document = inject(DOCUMENT);
  readonly #loaded = new Set<string>();

  /** Makes sure the wordmark face and the chosen body and mono faces are on their way. */
  public load(body: BodyFont, mono: MonoFont): void {
    const urls = [BRAND_STYLESHEET, ...(BODY_STYLESHEETS[body] ?? []), ...(MONO_STYLESHEETS[mono] ?? [])];
    if (urls.some((url) => !this.#loaded.has(url))) {
      this.#preconnect(GOOGLE_FONTS.replace('/css2', ''));
      this.#preconnect(GOOGLE_FONT_FILES, true);
    }
    for (const url of urls) {
      this.#stylesheet(url);
    }
  }

  #stylesheet(url: string): void {
    if (this.#loaded.has(url)) {
      return;
    }
    this.#loaded.add(url);
    const link = this.#document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    this.#document.head.append(link);
  }

  #preconnect(origin: string, crossOrigin = false): void {
    if (this.#loaded.has(origin)) {
      return;
    }
    this.#loaded.add(origin);
    const link = this.#document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    if (crossOrigin) {
      link.crossOrigin = '';
    }
    this.#document.head.append(link);
  }
}
