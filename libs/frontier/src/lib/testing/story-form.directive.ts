import { Directive, inject, signal, TemplateRef, ViewContainerRef } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import type { FieldTree } from '@angular/forms/signals';

/** The model behind the `fr-async-form` stories. */
export interface StoryFormModel {
  readonly name: string;
  readonly player: string;
}

export interface StoryFormContext {
  readonly $implicit: FieldTree<StoryFormModel>;
}

/**
 * Storybook only: signal forms need an injection context, which a story's
 * render function doesn't have. `<ng-container *frStoryForm="let form">`
 * creates one form (name required) and hands it to the story's template.
 */
@Directive({ selector: '[frStoryForm]' })
export class StoryForm {
  readonly #form = form(signal<StoryFormModel>({ name: '', player: '' }), (path) => {
    required(path.name, { message: 'Name is required.' });
  });

  public constructor() {
    inject(ViewContainerRef).createEmbeddedView(inject<TemplateRef<StoryFormContext>>(TemplateRef), {
      $implicit: this.#form,
    });
  }

  public static ngTemplateContextGuard(_directive: StoryForm, context: unknown): context is StoryFormContext {
    return context !== undefined;
  }
}
