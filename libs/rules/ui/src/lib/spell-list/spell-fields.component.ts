import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DescriptionItem, DescriptionList, Glyph, Stack, Text } from '@pioneer/frontier';

import { ACTION_COST_MESSAGES } from '../rich-text/rich-text-messages';
import type { SingleSpellCostLine, SpellFieldsLine } from './spell-detail-line';
import { SpellFieldLabel, SpellListMessage } from './spell-list-messages';

/** One labelled value: the term is a message key. */
interface FieldRow {
  readonly key: string;
  readonly term: string;
  readonly text: string;
}

/** The row for a field, none when the spell has none. */
function present(key: string, term: string, text: string | undefined): FieldRow[] {
  return text === undefined ? [] : [{ key, term, text }];
}

/** The fields the spell has, in the order a stat block lists them; damage is "Effect". */
function rowsOf(fields: SpellFieldsLine): readonly FieldRow[] {
  return [
    ...present('range', SpellFieldLabel.Range, fields.range),
    ...present('area', SpellFieldLabel.Area, fields.area),
    ...present('targets', SpellFieldLabel.Targets, fields.targets),
    ...present('defence', SpellFieldLabel.Defence, fields.defence),
    ...fields.effects.flatMap(({ key, text }) => present(`effect:${key}`, SpellListMessage.Effect, text)),
    ...present('duration', SpellFieldLabel.Duration, fields.duration),
  ];
}

/**
 * What casting a spell, or one of its variants, takes and does at the rank it is cast: the cost in action glyphs, then
 * the range, area, targets, defence, damage or healing and duration the spell has. Used by `pio-spell-details`.
 */
@Component({
  selector: 'pio-spell-fields',
  imports: [DescriptionItem, DescriptionList, Glyph, Stack, Text, TranslocoPipe],
  templateUrl: './spell-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellFields {
  public readonly fields = input.required<SpellFieldsLine>();

  protected readonly Message = SpellListMessage;
  protected readonly costs = ACTION_COST_MESSAGES;
  /** The ways of casting the caster picks from; one for most spells. */
  protected readonly costOptions = computed((): readonly SingleSpellCostLine[] => {
    const { cost } = this.fields();
    return cost.kind === 'either' ? cost.options : [cost];
  });
  protected readonly rows = computed((): readonly FieldRow[] => rowsOf(this.fields()));
}
