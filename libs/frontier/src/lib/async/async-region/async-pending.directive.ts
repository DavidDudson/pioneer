import { Directive, inject, TemplateRef } from '@angular/core';

/** What an `fr-async-region` shows while loading: skeletons shaped like the content. */
@Directive({ selector: 'ng-template[frAsyncPending]' })
export class AsyncPending {
  public readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
