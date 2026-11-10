import type { RuleElement } from './rule-element';
import { RuleElementKey } from './rule-element-base';
import type { ItemAlterationElement } from './rule-element-item-alteration';
import { NumericItemProperty } from './rule-element-item-alteration';

/**
 * Whether the element raises the potency of the item the rune is etched onto: an `etched` `ItemAlteration` of the
 * `potency` property. Such a rune (a mythic potency rune) takes no property rune slot of its own (ADR-0078). A
 * `predicate` would make that depend on the situation, so an element with one never frees a slot.
 */
export function raisesPotency(element: RuleElement): element is ItemAlterationElement {
  return (
    element.key === RuleElementKey.ItemAlteration &&
    element.property === NumericItemProperty.Potency &&
    element.etched === true &&
    (element.predicate === undefined || element.predicate.length === 0)
  );
}
