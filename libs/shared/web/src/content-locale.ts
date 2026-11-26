import { InjectionToken, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';
import type { ContentLocale } from '@pioneer/shared/kernel';

/**
 * The language names and descriptions are read in. The app provides the viewer's content locale preference (ADR-0013);
 * a page or spec that provides nothing reads the source locale.
 */
export const CONTENT_LOCALE = new InjectionToken<Signal<ContentLocale>>('CONTENT_LOCALE', {
  providedIn: 'root',
  factory: (): Signal<ContentLocale> => signal(SOURCE_CONTENT_LOCALE).asReadonly(),
});
