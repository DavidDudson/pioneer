import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { onTestFinished } from 'vitest';

import { Field } from '../forms/field/field.component';

/**
 * An `fr-field` with parts and controls added one at a time, each created under the field's injector the way
 * projection into a parent template would, so specs see the DI wiring (ids, description, invalid state).
 */
export class FieldHarness {
  public readonly field: ComponentRef<Field>;
  /** Holds the field and every part, in the document so ids resolve. */
  public readonly root = document.createElement('div');
  readonly #appRef = TestBed.inject(ApplicationRef);
  readonly #environmentInjector = TestBed.inject(EnvironmentInjector);

  public constructor() {
    this.field = createComponent(Field, { environmentInjector: this.#environmentInjector });
    this.#mount(this.field);
    document.body.append(this.root);
    onTestFinished(() => {
      this.root.remove();
    });
  }

  /** Adds a part or control with `text` projected into it, inside the field. */
  public add<TComponent>(
    component: Type<TComponent>,
    text?: string,
    inputs: Readonly<Record<string, unknown>> = {},
  ): ComponentRef<TComponent> {
    const ref = createComponent(component, {
      environmentInjector: this.#environmentInjector,
      elementInjector: this.field.injector,
      projectableNodes: text === undefined ? [] : [[document.createTextNode(text)]],
    });
    for (const [name, value] of Object.entries(inputs)) {
      ref.setInput(name, value);
    }
    this.#mount(ref);
    return ref;
  }

  public async stable(): Promise<void> {
    await this.#appRef.whenStable();
  }

  /** The text of whatever `element`'s `aria-describedby` points at, in order. */
  public described(element: Element): string[] {
    const ids = element.getAttribute('aria-describedby')?.split(' ') ?? [];
    return ids.map((id) => this.root.querySelector(`#${id}`)?.textContent.trim() ?? `missing #${id}`);
  }

  #mount(ref: ComponentRef<unknown>): void {
    this.#appRef.attachView(ref.hostView);
    const host: unknown = ref.location.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('Expected a host element');
    }
    this.root.append(host);
    onTestFinished(() => {
      ref.destroy();
    });
  }
}
