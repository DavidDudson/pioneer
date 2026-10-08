import { Directive, inject, TemplateRef } from '@angular/core';

export interface AsyncErrorContext {
  readonly $implicit: unknown;
}

/** Replaces an `fr-async-region`'s default failure message. `let-error` is the query's error. */
@Directive({ selector: 'ng-template[frAsyncError]' })
export class AsyncError {
  public readonly template = inject<TemplateRef<AsyncErrorContext>>(TemplateRef);

  public static ngTemplateContextGuard(_directive: AsyncError, context: unknown): context is AsyncErrorContext {
    return context !== undefined;
  }
}
