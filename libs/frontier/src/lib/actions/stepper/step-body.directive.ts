import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks the `<ng-template>` that holds a step's controls. The step instantiates it only while it is the current
 * step, so the controls of later steps do not exist (and load nothing) until the user gets there.
 */
@Directive({ selector: 'ng-template[frStepBody]' })
export class StepBody {
  public readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
