import { Directive } from '@angular/core';

/** Styled anchor; pair with `routerLink` or `href`. */
@Directive({
  selector: 'a[frLink]',
  host: {
    class:
      'rounded-control text-accent-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent-fg focus-visible:focus-ring',
  },
})
export class Link {}
