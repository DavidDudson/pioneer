import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { injectTranslate } from './inject-translate';
import type { Translate } from './inject-translate';

const KEY = 'greeting';

interface Harness {
  readonly translate: Signal<Translate>;
  readonly i18n: TranslocoService;
}

function setup(): Harness {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { en: { [KEY]: 'Hello' }, de: { [KEY]: 'Hallo' } },
        translocoConfig: { availableLangs: ['en', 'de'], defaultLang: 'en' },
      }),
    ],
  });

  const translate = TestBed.runInInjectionContext(() => injectTranslate());
  const i18n = TestBed.inject(TranslocoService);
  // The active language's messages are loaded, as they are once an app has started.
  i18n.load('en').subscribe();

  return { translate, i18n };
}

describe(injectTranslate, () => {
  it('translates a key in the active language', () => {
    const { translate } = setup();

    expect(translate()(KEY)).toBe('Hello');
  });

  it('is a new function after a language switch, so a computed reads its messages again', () => {
    const { translate, i18n } = setup();
    const greeting = computed(() => translate()(KEY));
    const before = translate();

    expect(greeting()).toBe('Hello');

    i18n.load('de').subscribe();
    i18n.setActiveLang('de');

    expect(translate()).not.toBe(before);
    expect(greeting()).toBe('Hallo');
  });

  it('is a new function when messages finish loading, without a language switch', () => {
    const { translate, i18n } = setup();
    const before = translate();

    i18n.load('de').subscribe();

    expect(translate()).not.toBe(before);
  });
});
