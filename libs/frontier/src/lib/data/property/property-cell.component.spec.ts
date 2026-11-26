import { Component, input } from '@angular/core';
import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { PropertyCell } from './property-cell.component';
import { ENTITY_CELL, providePropertyKinds } from './property-kind-registry';
import { PropertyAlign, PropertyKindId } from './property.types';
import type { PropertyDescriptor, PropertyKind } from './property.types';

interface Hero {
  readonly name: string;
  readonly level: number;
  readonly active: boolean;
  readonly joined: Temporal.PlainDate;
}

const VALEROS: Hero = {
  name: 'Valeros',
  level: 1234,
  active: true,
  joined: Temporal.PlainDate.from('2026-10-07'),
};

// oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
@Component({ selector: 'fr-test-shout', template: '<b>{{ value().toUpperCase() }}</b>' })
class Shout {
  public readonly value = input.required<string>();
}

// oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
@Component({ selector: 'fr-test-entity-name', template: '<i>{{ entity().name }}</i>' })
class EntityName {
  public readonly entity = input.required<Hero>();
}

const NAME: PropertyDescriptor<Hero> = {
  id: 'name',
  label: 'hero.name',
  kind: PropertyKindId.Text,
  value: (hero) => hero.name,
};

async function render(property: PropertyDescriptor<Hero>, providers: readonly Provider[] = []): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [...provideFrontierI18nTesting(), ...providers],
  });
  const fixture: ComponentFixture<PropertyCell<Hero>> = TestBed.createComponent<PropertyCell<Hero>>(PropertyCell);
  fixture.componentRef.setInput('property', property);
  fixture.componentRef.setInput('entity', VALEROS);
  await fixture.whenStable();

  // SAFETY: a rendered component's host element is an HTMLElement under the DOM test environment; nativeElement is typed any.
  return fixture.nativeElement as HTMLElement;
}

describe(PropertyCell, () => {
  it('shows a text value as text', async () => {
    const host = await render(NAME);
    expect(host.textContent.trim()).toBe('Valeros');
  });

  it('formats a number through the locale', async () => {
    const host = await render({ ...NAME, kind: PropertyKindId.Number, value: (hero) => hero.level });
    expect(host.textContent.trim()).toBe('1,234');
  });

  it('shows a bool as a translated yes or no', async () => {
    const host = await render({ ...NAME, kind: PropertyKindId.Bool, value: (hero) => hero.active });
    expect(host.textContent.trim()).toBe('Yes');
  });

  it('renders a date with fr-date, the date kind cell', async () => {
    const host = await render({ ...NAME, kind: PropertyKindId.Date, value: (hero) => hero.joined });
    expect(host.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-07');
  });

  it('prefers the property cell to the kind and entity cells', async () => {
    const host = await render({ ...NAME, kind: PropertyKindId.Date, cell: Shout }, [
      { provide: ENTITY_CELL, useValue: EntityName },
    ]);

    expect(host.querySelector('b')?.textContent).toBe('VALEROS');
  });

  it('uses the entity cell when the property and its kind have none', async () => {
    const host = await render(NAME, [{ provide: ENTITY_CELL, useValue: EntityName }]);
    expect(host.querySelector('i')?.textContent).toBe('Valeros');
  });

  it('uses a kind a ui library registers', async () => {
    const shouting: PropertyKind<string> = {
      id: 'shout',
      align: PropertyAlign.Start,
      operators: [],
      cell: Shout,
      compare: () => 0,
      text: (value) => value,
    };

    const host = await render({ ...NAME, kind: 'shout' }, [providePropertyKinds(shouting)]);

    expect(host.querySelector('b')?.textContent).toBe('VALEROS');
  });

  it('throws on a kind nobody registered', async () => {
    await expect(render({ ...NAME, kind: 'nope' })).rejects.toThrow('No property kind "nope"');
  });
});
