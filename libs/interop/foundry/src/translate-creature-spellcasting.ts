import { ContentKind, Uses } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { Count, itemSystem, Slug } from './creature-embedded';
import type { Embedded } from './creature-embedded';
import { resolveSlug } from './entry-references';
import { slugify } from './foundry-slug';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';

/** A creature's `spellcastingEntry` items with the `spell` items placed in each, as spellcasting entries. */

const FoundrySpellcasting = z.looseObject({
  tradition: z.looseObject({ value: Slug }),
  prepared: z.looseObject({ value: Slug }),
  spelldc: z.looseObject({ dc: z.number(), value: z.number() }),
});

const SpellLocation = z.looseObject({
  value: Slug.nullish(),
  heightenedLevel: z.number().nullish(),
  uses: z.looseObject({ max: z.number() }).nullish(),
});
const FoundrySpell = z.looseObject({ level: Count, location: SpellLocation.default({}) });

const CONSTANT = 'constant';

interface CastSpell {
  readonly spell: ContentId;
  readonly rank: number;
  readonly uses?: number;
  readonly constant?: true;
}

interface Qualified {
  readonly spell: string;
  readonly constant: boolean;
}

/** "Truesight (Constant)", "Charm (At Will, Self Only)": the spell, and how a creature has it. */
function qualified(name: string): Qualified {
  const open = name.lastIndexOf('(');
  const closed = name.endsWith(')');
  if (open === -1 || !closed) {
    return { spell: name, constant: false };
  }
  const note = name.slice(open + 1, -1).toLowerCase();
  return { spell: name.slice(0, open).trim(), constant: note.includes(CONSTANT) };
}

function spellOf(item: Embedded, input: KindInput): CastSpell | undefined {
  const system = itemSystem(FoundrySpell, item, input);
  const { spell: name, constant } = qualified(item.name);
  const spell = system === undefined ? undefined : resolveSlug(input.references, ContentKind.Spell, slugify(name));
  if (system === undefined || spell === undefined) {
    report(input.log, { reason: KindDataGapReason.UnresolvedReference, field: 'spellcasting.spells', raw: item.name });
    return undefined;
  }
  const max = system.location.uses?.max;
  const uses = max === undefined ? undefined : Uses.safeParse(max).data;
  return {
    spell,
    rank: system.location.heightenedLevel ?? system.level.value,
    ...(uses === undefined ? {} : { uses }),
    ...(constant ? { constant: true as const } : {}),
  };
}

/** Whether a spell item sits in the entry with this id. */
function placedIn(item: Embedded, entry: string): boolean {
  const { location } = item.system;
  return typeof location === 'object' && location !== null && 'value' in location && location.value === entry;
}

function entryOf(entry: Embedded, items: readonly Embedded[], input: KindInput): object | undefined {
  const system = itemSystem(FoundrySpellcasting, entry, input);
  const { _id: id } = entry;
  const spells = items.filter((item) => item.type === 'spell' && placedIn(item, id));
  return system === undefined
    ? undefined
    : {
        name: entry.name,
        tradition: system.tradition.value,
        preparation: system.prepared.value,
        dc: system.spelldc.dc,
        attack: system.spelldc.value,
        spells: spells.flatMap((item) => spellOf(item, input) ?? []),
      };
}

/** The creature's spellcasting, one entry per `spellcastingEntry` item. */
export function spellcastingOf(items: readonly Embedded[], input: KindInput): readonly object[] {
  return items
    .filter((item) => item.type === 'spellcastingEntry')
    .flatMap((entry) => entryOf(entry, items, input) ?? []);
}
