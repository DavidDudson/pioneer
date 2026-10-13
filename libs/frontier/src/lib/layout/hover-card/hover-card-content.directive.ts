import { Directive, inject, TemplateRef } from '@angular/core';

/** Marks the template a hover card shows; it is only created while the card is open. */
@Directive({ selector: 'ng-template[frHoverCardContent]' })
export class HoverCardContent {
  public readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
