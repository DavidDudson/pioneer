import { EffectChange, EffectStatusKind } from '@pioneer/rules/engine';
import type { EffectStatus } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import {
  ConditionValue,
  ContentId,
  contentId,
  ContentLevel,
  ContentText,
  DamageAmount,
  DamageException,
  EntrySlug,
  Feet,
  ModifierType,
  PackId,
  RichText,
  RuleElementKey,
  Selector,
  SourceRef,
} from '@pioneer/rules/sdk';

import { line } from '../testing/breakdown-fixtures';
import type { EntryPreview, EntryPreviews, PreviewEffect } from './entry-preview';

const SPELL_LEVEL = ContentLevel.parse(3);

export const FIREBALL = contentId(PackId.parse('player-core'), EntrySlug.parse('spell:fireball'));

/** Fireball as a preview shows it: two paragraphs, of which the card keeps the first. */
export const FIREBALL_PREVIEW: EntryPreview = {
  name: ContentText.parse('Fireball'),
  level: SPELL_LEVEL,
  traits: ['concentrate', 'fire', 'manipulate'],
  summary: RichText.parse([
    { type: 'paragraph', content: [{ type: 'text', text: 'A roaring blast of fire burns creatures in the area.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Heightened: the damage increases by 2d6.' }] },
  ]),
  sources: [SourceRef.parse({ kind: 'book', book: 'player-core', page: 326 })],
};

export const DARKVISION = contentId(PackId.parse('player-core'), EntrySlug.parse('sense:darkvision'));

const CLUMSY = contentId(PackId.parse('player-core'), EntrySlug.parse('condition:clumsy'));

/** Clumsy 2 on a character: the entry with its value, and the statistics it lowers by that value. */
interface ModifierOptions {
  readonly statistic: string;
  readonly selector: string;
  readonly value: number;
  readonly status?: EffectStatus;
}

/** A bonus or penalty an entry has on one statistic, as the engine summarises it. */
export function modifierPreviewEffect(entryId: typeof FIREBALL, options: ModifierOptions): PreviewEffect {
  const { statistic, selector, value, status } = options;
  const entry = ContentId.parse(entryId);
  const { modifier, adjustedBy } = line(entry, { type: ModifierType.Status, value });
  return {
    statistic,
    line: {
      change: value < 0 ? EffectChange.Penalty : EffectChange.Bonus,
      rule: modifier.id,
      label: modifier.label,
      origin: modifier.origin,
      selector: Selector.parse(selector),
      type: ModifierType.Status,
      value: FormulaValue.parse(value),
      adjustedBy,
      status: status ?? { kind: EffectStatusKind.Applied },
    },
  };
}

/** A sense an entry gives, with the name its caller found for it. */
export function sensePreviewEffect(
  entryId: typeof FIREBALL,
  options: { readonly name?: string; readonly range?: number },
): PreviewEffect {
  const entry = ContentId.parse(entryId);
  const { modifier } = line(entry, { type: ModifierType.Status, value: 0 });
  return {
    statistic: undefined,
    ...(options.name === undefined ? {} : { sense: options.name }),
    line: {
      change: EffectChange.Sense,
      rule: modifier.id,
      label: modifier.label,
      origin: modifier.origin,
      status: { kind: EffectStatusKind.Applied },
      sense: ContentId.parse(DARKVISION),
      acuity: 'precise',
      ...(options.range === undefined ? {} : { range: Feet.parse(options.range) }),
    },
  };
}

const RESISTANCE = DamageAmount.parse(5);

/** A resistance to physical damage with exceptions, with the names its caller found for them. */
export function resistancePreviewEffect(
  entryId: typeof FIREBALL,
  options: { readonly exceptions: readonly string[]; readonly names?: readonly string[] },
): PreviewEffect {
  const entry = ContentId.parse(entryId);
  const { modifier } = line(entry, { type: ModifierType.Status, value: 0 });
  return {
    statistic: undefined,
    ...(options.names === undefined ? {} : { exceptions: options.names }),
    line: {
      change: EffectChange.Resistance,
      rule: modifier.id,
      label: modifier.label,
      origin: modifier.origin,
      status: { kind: EffectStatusKind.Applied },
      damage: 'physical',
      value: RESISTANCE,
      exceptions: options.exceptions.map((exception) => DamageException.parse(exception)),
    },
  };
}

/** A rule element the engine's summary does not cover yet. */
export function notSummarisedPreviewEffect(entryId: typeof FIREBALL): PreviewEffect {
  const entry = ContentId.parse(entryId);
  const { modifier } = line(entry, { type: ModifierType.Status, value: 0 });
  return {
    statistic: undefined,
    line: {
      change: EffectChange.NotSummarised,
      rule: modifier.id,
      label: modifier.label,
      origin: modifier.origin,
      element: RuleElementKey.ChoiceSet,
    },
  };
}

export const CLUMSY_PREVIEW: EntryPreview = {
  name: ContentText.parse('Clumsy'),
  level: undefined,
  traits: [],
  summary: RichText.parse([
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Your movements become clumsy and inexact. Clumsy always includes a value.' }],
    },
  ]),
  sources: [SourceRef.parse({ kind: 'book', book: 'player-core', page: 442 })],
  value: ConditionValue.parse(2),
  effects: [
    modifierPreviewEffect(CLUMSY, { statistic: 'Armor Class', selector: 'ac', value: -2 }),
    modifierPreviewEffect(CLUMSY, { statistic: 'Reflex', selector: 'reflex', value: -2 }),
  ],
};

/** Previews that hold fireball and nothing else. */
export const FIREBALL_PREVIEWS: EntryPreviews = {
  preview: (id): EntryPreview | undefined => (id === FIREBALL ? FIREBALL_PREVIEW : undefined),
};
