import { ContentKind, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveSlug } from './entry-references';
import { addRule, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';

/**
 * The languages a feat or class feature teaches, from Foundry's `subfeatures.languages`, as a `Language` element
 * (content-model.md, "Languages").
 */

const FIELD_MAX = 64;
const LANGUAGES_MAX = 16;
const FIELD = 'subfeatures.languages';

const FoundrySubfeatureLanguages = z.looseObject({
  granted: z.array(z.string().max(FIELD_MAX)).max(LANGUAGES_MAX).default([]),
  slots: z.number().int().nonnegative().default(0),
});

/** The `language` entries the granted slugs name; one the import doesn't have (a secret language) is reported. */
function grantedLanguages(slugs: readonly string[], { references, log }: KindInput): ContentId[] {
  return slugs.flatMap((slug) => {
    const id = resolveSlug(references, ContentKind.Language, slug);
    if (id === undefined) {
      report(log, { reason: KindDataGapReason.UnresolvedReference, field: `${FIELD}.granted`, raw: slug });
    }
    return id === undefined ? [] : [id];
  });
}

/** `subfeatures.languages` as a `Language` element granting its languages and opening its slots; none when unset. */
export function languageRules(raw: unknown, input: KindInput): void {
  if (raw === undefined) {
    return;
  }
  const languages = FoundrySubfeatureLanguages.safeParse(raw);
  if (!languages.success) {
    report(input.log, { reason: KindDataGapReason.InvalidData, field: FIELD, raw });
    return;
  }
  const grant = grantedLanguages(languages.data.granted, input);
  const { slots } = languages.data;
  if (grant.length === 0 && slots === 0) {
    return;
  }
  addRule(input, FIELD, {
    key: RuleElementKey.Language,
    ...(grant.length === 0 ? {} : { grant }),
    ...(slots === 0 ? {} : { slots }),
  });
}
