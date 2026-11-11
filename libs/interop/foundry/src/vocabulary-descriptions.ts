import type { RichText } from '@pioneer/rules/sdk';

import { bactrian, langLabel } from './foundry-config';
import type { FoundryConfig } from './foundry-config';
import type { FoundryLang } from './foundry-release';
import { htmlToRichText } from './html-rich-text';

/** Descriptions of vocabulary entries: where Foundry keeps a trait's text, and what an entry without any reports. */

/** Foundry's marker for a trait it has no text for. */
const NO_DESCRIPTION_KEY = 'PF2E.TraitNoDescription';

/**
 * Where a trait's description may be: the key `traitDescriptions` maps it to, then the key Foundry's naming gives it
 * (`PF2E.TraitDescriptionReckless`), which a few traits have text under without being mapped.
 */
export function traitDescriptionKeys(slug: string, config: FoundryConfig): readonly string[] {
  const mapped = config.traitDescriptions.get(slug);
  const keys = [...(mapped === undefined ? [] : [mapped]), `PF2E.TraitDescription${bactrian(slug)}`];
  return [...new Set(keys)].filter((key) => key !== NO_DESCRIPTION_KEY);
}

/** The text of the first of `keys` the lang table has text for. */
export function descriptionHtml(keys: readonly string[], lang: FoundryLang): string | undefined {
  return keys.map((key) => langLabel(lang, key)).find((text) => text !== undefined && text !== '');
}

/** The description the first key with text gives, or none. */
export function descriptionOf(keys: readonly string[] | undefined, lang: FoundryLang): RichText {
  const html = keys === undefined ? undefined : descriptionHtml(keys, lang);
  return html === undefined ? [] : htmlToRichText(html).richText;
}
