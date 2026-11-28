import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * What an async region, section or list shows when its query loaded with nothing in it while a filter is active
 * (`filtered`). Put the Clear action in it; the default one has a Clear button that emits `cleared`.
 */
@Directive({ selector: 'ng-template[frAsyncFilteredEmpty]' })
export class AsyncFilteredEmpty {
  public readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
