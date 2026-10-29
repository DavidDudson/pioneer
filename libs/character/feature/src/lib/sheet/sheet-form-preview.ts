import { withPlay } from '@pioneer/character/domain';
import type { ActiveEffect, Character } from '@pioneer/character/domain';
import type { StatisticResult } from '@pioneer/rules/engine';
import { Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { FormPreview, FormPreviewRow } from '@pioneer/rules/ui';

import { withoutForms } from './sheet-effects';
import { sheetDerivation, sheetFormTempHp } from './sheet-statistics';

/** The statistics a form is previewed against: Armor Class, then every Speed it can give or take away. */
const PREVIEWED: readonly Selector[] = [
  'ac',
  'speed:land',
  'speed:fly',
  'speed:swim',
  'speed:climb',
  'speed:burrow',
].map((selector) => Selector.parse(selector));

/** The speeds among the previewed statistics, which are worded in feet. */
const SPEEDS: ReadonlySet<Selector> = new Set(PREVIEWED.filter((selector) => selector.startsWith('speed:')));

/** The message each previewed value is worded with; the temporary Hit Points row is named by its own. */
const FormPreviewMessage = {
  Feet: 'character.sheet.formPreview.feet',
  TempHp: 'character.sheet.formPreview.tempHp',
} as const;

/** Words a message key and its parameters in the viewer's language. */
export type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** The total of a statistic, or undefined when the engine could not work it out. */
function totalOf(result: StatisticResult | undefined): number | undefined {
  return result?.ok === true ? result.total : undefined;
}

function wordedValue(selector: Selector, total: number, translate: Translate): string {
  return SPEEDS.has(selector) ? translate(FormPreviewMessage.Feet, { value: total }) : String(total);
}

/** The row for `selector` when the form changes its total, else none. */
function rowOf(selector: Selector, { own, form, registry, translate }: Comparison): readonly FormPreviewRow[] {
  const before = totalOf(own.get(selector));
  const after = totalOf(form.get(selector));
  const name = registry.statisticsFor(selector).at(-1)?.definition.name;
  if (before === undefined || after === undefined || before === after || name === undefined) {
    return [];
  }
  return [
    {
      name,
      own: wordedValue(selector, before, translate),
      form: wordedValue(selector, after, translate),
    },
  ];
}

interface Comparison {
  readonly own: ReadonlyMap<Selector, StatisticResult>;
  readonly form: ReadonlyMap<Selector, StatisticResult>;
  readonly registry: ContentRegistry;
  readonly translate: Translate;
}

/** What a form is previewed from: the content, the character, the effect that would put the form on it, and the words. */
export interface FormPreviewInputs {
  readonly registry: ContentRegistry;
  readonly character: Character;
  readonly candidate: ActiveEffect;
  readonly translate: Translate;
}

/**
 * What `candidate`, a polymorph effect, would change on the sheet: the statistics it sets to another value, each with
 * the character's number as it stands beside the form's, and the temporary Hit Points it would give. The candidate is
 * worked out by the engine as it is for the sheet, on the character without the form it is in now, which the
 * candidate replaces. A statistic the form leaves as it is does not show.
 */
export function sheetFormPreview({ registry, character, candidate, translate }: FormPreviewInputs): FormPreview {
  const { play } = character.document;
  const morphed = withPlay(character, { ...play, effects: [...withoutForms(registry, play.effects), candidate] });
  const comparison: Comparison = {
    own: sheetDerivation(registry, character),
    form: sheetDerivation(registry, morphed),
    registry,
    translate,
  };
  const tempHp = sheetFormTempHp(registry, character, candidate);
  const temp: readonly FormPreviewRow[] =
    tempHp === undefined || tempHp === 0
      ? []
      : [{ name: translate(FormPreviewMessage.TempHp), own: String(play.hp.temp), form: String(tempHp) }];
  return { rows: [...PREVIEWED.flatMap((selector) => rowOf(selector, comparison)), ...temp] };
}
