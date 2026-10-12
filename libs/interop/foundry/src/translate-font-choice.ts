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

/**
 * Divine Font's `ChoiceSet` with a slug flag, each font offered while the character's deity has it, as Foundry's
 * predicates on `deity:primary:font:<font>` say (ADR-0045, ADR-0046). Its icons (`img`) are dropped as a display
 * concern. Any other element is left as it is.
 */
export function withFontChoice(raw: unknown): unknown {
  const font = FoundryFontChoice.safeParse(raw);
  if (!font.success) {
    return raw;
  }
  const choices = font.data.choices.map(({ value, label, predicate }) =>
    predicate === undefined ? { value, label } : { value, label, predicate },
  );
  return { ...font.data, flag: FONT_FLAG, choices };
}
