import { ContentId, contentId, DamageFormula, EntrySlug, InlineKind, PackId, SpellRank } from '@pioneer/rules/sdk';
import type { DamageType, TargetValue } from '@pioneer/rules/sdk';
import type { SpellDetailLine } from '@pioneer/rules/ui';

const PACK = PackId.parse('player-core');
const ONE_ACTION: SpellDetailLine['cost'] = { kind: 'actions', cost: 'one', upTo: undefined };
const FIRST_RANK = SpellRank.parse(1);

/** What a spell line test sets; every other field of the line is empty. */
export interface SpellLineFields {
  /** The spell's slug under `spell:`, which is also its content id's source. */
  readonly slug: string;
  readonly name: string;
  readonly source?: string | undefined;
  readonly targets?: ReadonlyArray<TargetValue> | undefined;
  readonly traits?: ReadonlyArray<string> | undefined;
  readonly damage?: ReadonlyArray<DamageType> | undefined;
  readonly cost?: SpellDetailLine['cost'] | undefined;
}

/** A spell as a list shows it, with the fields a spell has none of left out. */
export function spellLine({
  slug,
  name,
  source,
  targets = [],
  traits = [],
  damage = [],
  cost = ONE_ACTION,
}: SpellLineFields): SpellDetailLine {
  return {
    id: ContentId.parse(contentId(PACK, EntrySlug.parse(`spell:${slug}`))),
    name,
    rank: FIRST_RANK,
    targetValues: targets,
    counteract: false,
    tags: [],
    traits: traits.map((label) => ({ label })),
    source,
    variants: [],
    cost,
    range: undefined,
    area: undefined,
    targets: undefined,
    defence: undefined,
    duration: undefined,
    effects: damage.map((damageType) => ({
      key: damageType,
      text: damageType,
      roll: { type: InlineKind.Damage, instances: [{ formula: DamageFormula.parse('1d6'), damageType }] },
    })),
  };
}
