import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks the `<ng-template>` that holds a section's content. The section instantiates it the first time it is not
 * `concealed` and keeps it after, so the sections of a set shown one at a time build (and load, and compute) nothing
 * until the user opens them, and keep their state once they have been.
 */
@Directive({ selector: 'ng-template[frSectionBody]' })
export class SectionBody {
  public readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
