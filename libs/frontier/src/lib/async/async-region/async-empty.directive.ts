import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * What an async region, section or list shows when its query loaded with nothing in it and no filter is active.
 */
@Directive({ selector: 'ng-template[frAsyncEmpty]' })
export class AsyncEmpty {
  public readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
