import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, reflectComponentType } from '@angular/core';
import type { Type } from '@angular/core';

import { Text } from '../../text/text/text.component';
import { ENTITY_CELL, findPropertyKind, injectPropertyContext, PROPERTY_KINDS } from './property-kind-registry';
import { PropertyAlign } from './property.types';
import type { PropertyDescriptor } from './property.types';
import { resolvePropertyCell } from './resolve-property-cell';

/** The inputs a cell component takes, by name: its value, its entity, or both. */
// oxlint-disable-next-line typescript/consistent-type-definitions -- only an alias has the implicit index signature that ngComponentOutlet's `inputs` (a Record) accepts
type CellInputs = {
  readonly value?: unknown;
  readonly entity?: unknown;
};

/** Keeps the inputs the component declares, so a cell can take `value`, `entity` or both. */
function declaredInputs(component: Type<unknown>, available: Required<CellInputs>): CellInputs {
  const declared = new Set((reflectComponentType(component)?.inputs ?? []).map((binding) => binding.templateName));

  const takesValue = declared.has('value');
  const takesEntity = declared.has('entity');

  if (takesValue && takesEntity) {
    return available;
  }

  if (takesValue) {
    return { value: available.value };
  }

  return takesEntity ? { entity: available.entity } : {};
}

/** One property of one entity as a table cell. */
@Component({
  selector: 'fr-property-cell',
  imports: [NgComponentOutlet, Text],
  templateUrl: './property-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PropertyCell<TEntity> {
  public readonly property = input.required<PropertyDescriptor<TEntity>>();
  public readonly entity = input.required<TEntity>();

  readonly #kinds = inject(PROPERTY_KINDS);
  readonly #entityCell = inject(ENTITY_CELL);
  readonly #context = injectPropertyContext();

  readonly #kind = computed(() => findPropertyKind(this.#kinds, this.property().kind));
  readonly #value = computed(() => this.property().value(this.entity()));

  protected readonly component = computed(() => resolvePropertyCell(this.property(), this.#kind(), this.#entityCell));

  protected readonly inputs = computed((): CellInputs => {
    const component = this.component();

    return component === undefined ? {} : declaredInputs(component, { value: this.#value(), entity: this.entity() });
  });

  protected readonly text = computed(() => this.#kind().text(this.#value(), this.#context));
  protected readonly numeric = computed(() => this.#kind().align === PropertyAlign.End);
}
