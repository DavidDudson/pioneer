import { FundamentalRune } from '@pioneer/rules/sdk';

/** The one glyph each fundamental rune shows, whatever its grade. A property rune always shows a pair, so the sets cannot collide. */
export const FUNDAMENTAL_GLYPHS: Readonly<Record<FundamentalRune, string>> = {
  [FundamentalRune.Potency]: 'ᚠ',
  [FundamentalRune.Striking]: 'ᚦ',
  [FundamentalRune.Resilient]: 'ᛒ',
  [FundamentalRune.Reinforcing]: 'ᛗ',
};
