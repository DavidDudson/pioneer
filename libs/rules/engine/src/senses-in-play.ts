import { Truth } from '@pioneer/rules/predicate';
import { RuleElementKey, SenseAcuity } from '@pioneer/rules/sdk';
import type { ContentId, Feet, Origin } from '@pioneer/rules/sdk';

import type { ModifierInputs } from './rule-in-play';
import { truthOf } from './rule-value';

/** A sense the character has: how exactly it locates what it detects, how far it reaches, and what gave it. */
export interface SenseInPlay {
  /** The `sense` entry of the `core-rules` vocabulary. */
  readonly sense: ContentId;
  readonly acuity: SenseAcuity;
  /** Absent when the sense reaches as far as the character can perceive. */
  readonly range?: Feet;
  /** Every ancestry vision and `Sense` element that gives it, in the order they were found. */
  readonly origins: readonly Origin[];
}

/** The vision an ancestry's data gives (darkvision, low-light vision): precise, with no range. */
export interface AncestryVision {
  readonly sense: ContentId;
  /** The ancestry, and how it got on the character. */
  readonly origin: Origin;
}

/** One grant of a sense, before grants of the same sense merge. */
interface SenseGrant {
  readonly sense: ContentId;
  readonly acuity: SenseAcuity;
  readonly range: Feet | undefined;
  readonly origin: Origin;
}

const ACUITY_ORDER: readonly SenseAcuity[] = [SenseAcuity.Vague, SenseAcuity.Imprecise, SenseAcuity.Precise];

function sharper(left: SenseAcuity, right: SenseAcuity): SenseAcuity {
  return ACUITY_ORDER.indexOf(left) >= ACUITY_ORDER.indexOf(right) ? left : right;
}

/** The longer of two ranges, where no range is unlimited. */
function farther(left: Feet | undefined, right: Feet | undefined): Feet | undefined {
  if (left === undefined || right === undefined) {
    return undefined;
  }
  return left >= right ? left : right;
}

function merged(held: SenseInPlay | undefined, grant: SenseGrant): SenseInPlay {
  if (held === undefined) {
    const { origin, range, ...rest } = grant;
    return { ...rest, ...(range === undefined ? {} : { range }), origins: [origin] };
  }
  const range = farther(held.range, grant.range);
  return {
    sense: held.sense,
    acuity: sharper(held.acuity, grant.acuity),
    ...(range === undefined ? {} : { range }),
    origins: [...held.origins, grant.origin],
  };
}

/**
 * The character's senses: the ancestry's vision and the senses of the `Sense` elements in play. An element whose
 * predicate fails or depends on the situation gives none on the sheet. Without an acuity a sense is precise, and
 * without a range it is unlimited, as in Foundry. Where two give one sense, the better acuity and the longer range
 * win, each on its own. In order of sense id.
 */
export function sensesInPlay({ rules, facts }: ModifierInputs, vision?: AncestryVision): readonly SenseInPlay[] {
  const grants: SenseGrant[] =
    vision === undefined ? [] : [{ ...vision, acuity: SenseAcuity.Precise, range: undefined }];
  for (const { element, origin } of rules) {
    if (element.key === RuleElementKey.Sense && truthOf(element.predicate, facts) === Truth.True) {
      const { sense, acuity = SenseAcuity.Precise, range } = element;
      grants.push({ sense, acuity, range, origin });
    }
  }
  const senses = new Map<ContentId, SenseInPlay>();
  for (const grant of grants) {
    senses.set(grant.sense, merged(senses.get(grant.sense), grant));
  }
  // Code-unit order, so the result never depends on the host's locale.
  return [...senses.values()].toSorted((left, right) => {
    if (left.sense === right.sense) {
      return 0;
    }
    return left.sense < right.sense ? -1 : 1;
  });
}
