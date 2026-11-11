import { EnvironmentInjector, inject, Injectable, PendingTasks, runInInjectionContext } from '@angular/core';
import { DefaultTranspiler } from '@jsverse/transloco';
import type { TranslocoTranspiler, TranspileParams } from '@jsverse/transloco';

/**
 * The compiler's own chunk, requested as soon as this module loads so it arrives beside the entry bundle rather than
 * after it. A failed fetch rejects `load()`, so the app fails to start loudly.
 */
const COMPILER = import('@jsverse/transloco-messageformat');

/**
 * Transloco's ICU transpiler, with the message compiler fetched on demand. `@messageformat/core` is about 100 kB of
 * parser, compiler and plural rules, so it loads in its own chunk, beside the first locale's messages, instead of
 * inside the entry bundle. Until `load()` resolves it only fills `{{ }}` placeholders; the locale loader waits for it
 * before it returns messages, so no ICU message is ever shown uncompiled.
 */
@Injectable()
export class LazyIcuTranspiler extends DefaultTranspiler {
  readonly #injector = inject(EnvironmentInjector);
  readonly #pending = inject(PendingTasks);
  #icu: TranslocoTranspiler | undefined;
  #loading: Promise<void> | undefined;
  #lang: string | undefined;

  /**
   * Fetches and builds the ICU transpiler, once. The locale loader awaits this before it returns any messages, so a
   * message is never transpiled before the compiler is ready. The fetch is also a pending task, so a component test
   * that awaits `whenStable()` waits for it.
   */
  public async load(): Promise<void> {
    this.#loading ??= this.#fetch();
    await this.#loading;
  }

  async #fetch(): Promise<void> {
    const done = this.#pending.add();
    try {
      const { MessageFormatTranspiler } = await COMPILER;
      // The transpiler is built here, not by DI, so it needs an injection context for transloco's own `inject` calls.
      const icu = runInInjectionContext(this.#injector, () => new MessageFormatTranspiler({}));
      if (this.#lang !== undefined) {
        icu.onLangChanged(this.#lang);
      }
      this.#icu = icu;
    } finally {
      done();
    }
  }

  public override transpile(params: TranspileParams): unknown {
    return this.#icu === undefined ? super.transpile(params) : this.#icu.transpile(params);
  }

  public onLangChanged(lang: string): void {
    this.#lang = lang;
    this.#icu?.onLangChanged?.(lang);
  }
}
