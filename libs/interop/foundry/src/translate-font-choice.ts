import { RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** One of Divine Font's fonts, offered while its predicate holds. */
const FontOption = z.looseObject({ value: z.unknown(), label: z.unknown(), predicate: z.array(z.string()).optional() });

/** Divine Font's `ChoiceSet`: a healing or harmful font, each offered while the deity's font is it. */
const FoundryFontChoice = z.looseObject({
  key: z.literal(RuleElementKey.ChoiceSet),
  flag: z.literal('divineFont'),
  choices: z.array(FontOption),
});

/** The flag Pioneer stores the font under, Foundry's `divineFont` as a slug; its `rollOption` is the same. */
const FONT_FLAG = 'divine-font';

/** A deity's font, as Foundry's Divine Font predicates on it: `deity:primary:font:heal`. */
const DEITY_FONT = /^deity:primary:font:[a-z]+$/u;

/**
 * Divine Font's `ChoiceSet` with a slug flag, and both fonts offered whatever the deity (ADR-0045): a character has no
 * deity to read the font from until #469, and Pioneer knows the `deity` namespace, so Foundry's predicates on it would
 * hide both. Its icons (`img`) are dropped as a display concern. Any other element is left as it is.
 */
export function withFontChoice(raw: unknown): unknown {
  const font = FoundryFontChoice.safeParse(raw);
  if (!font.success) {
    return raw;
  }
  const choices = font.data.choices.map(({ value, label, predicate }) => {
    const kept = (predicate ?? []).filter((atom) => !DEITY_FONT.test(atom));
    return kept.length === 0 ? { value, label } : { value, label, predicate: kept };
  });
  return { ...font.data, flag: FONT_FLAG, choices };
}
