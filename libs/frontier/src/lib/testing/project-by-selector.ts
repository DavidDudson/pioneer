import { reflectComponentType } from '@angular/core';
import type { Type } from '@angular/core';

/**
 * Sorts elements into a component's `<ng-content>` slots the way a parent template would: each element goes to
 * the first named slot whose selector it matches, or to the default slot. For `projectableNodes`, so a spec fails
 * when a slot's selector changes.
 */
export function projectBySelector(component: Type<unknown>, elements: readonly Element[]): Element[][] {
  const selectors = reflectComponentType(component)?.ngContentSelectors ?? [];
  const named = selectors.filter((selector) => selector !== '*');
  const slotOf = (element: Element): string => named.find((selector) => element.matches(selector)) ?? '*';
  return selectors.map((selector) => elements.filter((element) => slotOf(element) === selector));
}
