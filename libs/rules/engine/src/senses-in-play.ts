import { Truth } from '@pioneer/rules/predicate';
import { RuleElementKey, SenseAcuity } from '@pioneer/rules/sdk';
import type { ContentId, Feet, Origin } from '@pioneer/rules/sdk';

import { battleFormInPlay } from './battle-form';
import type { ModifierInputs } from './rule-in-play';
import { truthOf } from './rule-value';

/** A sense the character has: how exactly it locates what it detects, how far it reaches, and what gave it. */
export interface SenseInPlay {
  /** The `sense` entry of the `core-rules` vocabulary. */
  readonly sense: ContentId;
  readonly acuity: SenseAcuity;
  /** Absent when the sense reaches as far as the character can perceive. */
  readonly range?: Feet;
  /** Every ancestry vision and `Sense` element that gives it with this acuity and range, in the order found. */
  readonly origins: readonly Origin[];
  /** Set when a battle form gives the sense: the sheet marks it as from the form. */
  readonly fromForm?: true;
}

/** The vision an ancestry's data gives (darkvision, low-light vision): precise, with no range. */
export interface AncestryVision {
  readonly sense: ContentId;
  /** The ancestry, and how it got on the character. */
  readonly origin: Origin;
}

/** One grant of a sense, before grants of the same sense are compared. */
interface SenseGrant {
  readonly sense: ContentId;
  readonly acuity: SenseAcuity;
  readonly range: Feet | undefined;
  readonly origin: Origin;
  readonly fromForm?: true;
}

const ACUITY_ORDER: readonly SenseAcuity[] = [SenseAcuity.Vague, SenseAcuity.Imprecise, SenseAcuity.Precise];

/** Whether `left` reaches at least as far as `right`, where no range is unlimited. */
function reachesAsFar(left: Feet | undefined, right: Feet | undefined): boolean {
  if (left === undefined) {
    return true;
  }
  return right !== undefined && left >= right;
}

/** Whether `left` is at least as acute as `right`. */
function asAcute(left: SenseAcuity, right: SenseAcuity): boolean {
  return ACUITY_ORDER.indexOf(left) >= ACUITY_ORDER.indexOf(right);
}

/** Whether `left` is at least as acute and reaches at least as far as `right`. */
function covers(left: SenseGrant, right: SenseGrant): boolean {
  return asAcute(left.acuity, right.acuity) && reachesAsFar(left.range, right.range);
}

function sameReading(left: SenseGrant, right: SenseGrant): boolean {
  return left.sense === right.sense && left.acuity === right.acuity && left.range === right.range;
}

/** Whether another grant of its sense covers `grant` and is better in acuity or range. */
function isBeaten(grant: SenseGrant, grants: readonly SenseGrant[]): boolean {
  return grants.some((other) => other.sense === grant.sense && !sameReading(other, grant) && covers(other, grant));
}

/** Whether `left` comes first: by sense id in code-unit order, never the host's locale, then the more acute, then the farther. */
function precedes(left: SenseInPlay, right: SenseInPlay): boolean {
  if (left.sense !== right.sense) {
    return left.sense < right.sense;
  }
  if (left.acuity !== right.acuity) {
    return asAcute(left.acuity, right.acuity);
  }
  return reachesAsFar(left.range, right.range);
}

/** The grants of `elements` whose predicate holds, after the ancestry's vision. */
function grantsOf({ rules, facts }: ModifierInputs, vision: AncestryVision | undefined): SenseGrant[] {
  const form = battleFormInPlay({ rules, facts });
  if (form?.form.senses !== undefined) {
    return form.form.senses.map(({ sense, acuity = SenseAcuity.Precise, range }) => ({
      sense,
      acuity,
      range,
      origin: form.origin,
      fromForm: true,
    }));
  }
  const grants: SenseGrant[] =
    vision === undefined ? [] : [{ ...vision, acuity: SenseAcuity.Precise, range: undefined }];
  for (const { element, origin } of rules) {
    if (element.key === RuleElementKey.Sense && truthOf(element.predicate, facts) === Truth.True) {
      const { sense, acuity = SenseAcuity.Precise, range } = element;
      grants.push({ sense, acuity, range, origin });
    }
  }
  return grants;
}

/**
 * The character's senses: the ancestry's vision and the senses of the `Sense` elements in play, taking each element's
 * acuity and range as written. An element whose predicate fails or depends on the situation gives none on the sheet.
 * A battle form that lists senses replaces all of them, the ancestry's included: its senses alone are the character's.
 * Without an acuity a sense is precise, and without a range it is unlimited, as in Foundry. Of the grants of one sense,
 * a grant another beats on acuity or range without being worse on the other is dropped, so where one is best on both it
 * alone remains; grants neither beats (imprecise scent 30 feet, vague scent unlimited) both remain. Grants that read
 * alike are one sense with each origin. In order of sense id, then the more acute and the farther first.
 */
export function sensesInPlay(inputs: ModifierInputs, vision?: AncestryVision): readonly SenseInPlay[] {
  const grants = grantsOf(inputs, vision);
  const senses: SenseInPlay[] = [];
  for (const grant of grants.filter((each) => !isBeaten(each, grants))) {
    const index = senses.findIndex(
      (held) => held.sense === grant.sense && held.acuity === grant.acuity && held.range === grant.range,
    );
    const held = senses[index];
    if (held === undefined) {
      const { origin, range, ...rest } = grant;
      senses.push({ ...rest, ...(range === undefined ? {} : { range }), origins: [origin] });
    } else {
      senses[index] = { ...held, origins: [...held.origins, grant.origin] };
    }
  }
  // Readings that match are merged above, so no two senses tie.
  return senses.toSorted((left, right) => (precedes(left, right) ? -1 : 1));
}
