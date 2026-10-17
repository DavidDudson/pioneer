import { glyphCost } from './action-glyph';
import { resolveUuid } from './entry-references';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { setFields } from './kind-fields';

/**
 * What using a consumable does, read from its description: the action glyph on its Activate line, and the effect it
 * links in an effects pack. Foundry keeps neither as a field. A consumable with no Activate glyph has no activation,
 * which plays as one action.
 */

const ACTIVATE_GLYPH = /<strong>\s*Activate[^<]*<\/strong>\s*<span class="action-glyph">(?<glyph>[^<]*)<\/span>/iu;
const EFFECT_LINK = /@UUID\[(?<uuid>Compendium\.pf2e\.[a-z-]*effects\.Item\.[^\]]+)\]/u;

function activationOf(html: string, input: KindInput): object | undefined {
  const glyph = ACTIVATE_GLYPH.exec(html)?.groups?.['glyph'];
  if (glyph === undefined) {
    return undefined;
  }
  const cost = glyphCost(glyph);
  if (cost === undefined) {
    report(input.log, { reason: KindDataGapReason.UnmappedValue, field: 'description.activate', raw: glyph });
    return undefined;
  }
  return { cost };
}

function effectOf(html: string, input: KindInput): string | undefined {
  const uuid = EFFECT_LINK.exec(html)?.groups?.['uuid'];
  if (uuid === undefined) {
    return undefined;
  }
  const effect = resolveUuid(input.references, uuid);
  if (effect === undefined) {
    report(input.log, { reason: KindDataGapReason.UnresolvedReference, field: 'effect', raw: uuid });
  }
  return effect;
}

/** The consumable's `activation` and `effect`, unparsed, from its description's HTML; none when it names neither. */
export function useOf(html: string, input: KindInput): object {
  return setFields({ activation: activationOf(html, input), effect: effectOf(html, input) });
}
