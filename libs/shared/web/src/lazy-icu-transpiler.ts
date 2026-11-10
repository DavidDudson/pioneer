import { EnvironmentInjector, inject, Injectable, runInInjectionContext } from '@angular/core';
import { DefaultTranspiler } from '@jsverse/transloco';
import type { TranslocoTranspiler, TranspileParams } from '@jsverse/transloco';

/**
 * Transloco's ICU transpiler, with the message compiler fetched on demand. `@messageformat/core` is about 100 kB of
 * parser, compiler and plural rules, so it loads in its own chunk, beside the first locale's messages, instead of
 * inside the entry bundle. Until `load()` resolves it only fills `{{ }}` placeholders; `provideI18n` waits for it
 * before the shell renders, so no ICU message is ever shown uncompiled.
 */
@Injectable()
export class LazyIcuTranspiler extends DefaultTranspiler {
  readonly #injector = inject(EnvironmentInjector);
  #icu: TranslocoTranspiler | undefined;
  #lang: string | undefined;

  /** Fetches and builds the ICU transpiler. Safe to call more than once. */
  public async load(): Promise<void> {
    if (this.#icu !== undefined) {
      return;
    }
    const { MessageFormatTranspiler } = await import('@jsverse/transloco-messageformat');
    // The transpiler is built here, not by DI, so it needs an injection context for transloco's own `inject` calls.
    const icu = runInInjectionContext(this.#injector, () => new MessageFormatTranspiler({}));
    if (this.#lang !== undefined) {
      icu.onLangChanged(this.#lang);
    }
    this.#icu = icu;
  }

  public override transpile(params: TranspileParams): unknown {
    return this.#icu === undefined ? super.transpile(params) : this.#icu.transpile(params);
  }

  public onLangChanged(lang: string): void {
    this.#lang = lang;
    this.#icu?.onLangChanged?.(lang);
  }
}
