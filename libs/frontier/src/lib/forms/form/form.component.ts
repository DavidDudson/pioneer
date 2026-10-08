import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { cva } from 'class-variance-authority';

const formClasses = cva('block')();

/**
 * A plain form: `(submitted)` fires on submit, without a page load. Prefer
 * inline editing; use a form only where values must go in together (e.g.
 * creating something). For server submits use `fr-async-form`.
 */
@Component({
  selector: 'fr-form',
  templateUrl: './form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Form {
  public readonly submitted = output();

  protected readonly classes = formClasses;

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
