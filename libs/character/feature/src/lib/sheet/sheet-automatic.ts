import { AutomaticKind, automaticTimeline } from '@pioneer/character/domain';
import type { AutomaticChange, Character, SlotContent } from '@pioneer/character/domain';
import { Proficiency, SlotRank } from '@pioneer/rules/sdk';
import type { AutomaticLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { sourceMessageOf } from './sheet-choice-source';

/** The selector's last segment, as words: `skill:lore:basket-weaving` reads "Basket weaving". */
function statisticName(selector: string): string {
  const last = selector.split(':').at(-1) ?? selector;
  const words = last.replaceAll('-', ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** What a rise reads as, by the rank it reaches; a rise never reaches untrained. */
const RISE_KEYS: Readonly<Record<Proficiency, string>> = {
  [Proficiency.Untrained]: 'rules.timeline.automatic.rise.trained',
  [Proficiency.Trained]: 'rules.timeline.automatic.rise.trained',
  [Proficiency.Expert]: 'rules.timeline.automatic.rise.expert',
  [Proficiency.Master]: 'rules.timeline.automatic.rise.master',
  [Proficiency.Legendary]: 'rules.timeline.automatic.rise.legendary',
};

/** What a change says, with a key that is unique within its level. */
interface AutomaticText {
  readonly key: string;
  readonly text: MessageDescriptor;
}

/** What a change says, as a message; its `key` makes it unique within its level. */
function lineOf(change: AutomaticChange): AutomaticText {
  switch (change.kind) {
    case AutomaticKind.ProficiencyRise: {
      return {
        key: `${change.kind}:${change.selector}`,
        text: message(RISE_KEYS[change.to], { statistic: statisticName(change.selector) }),
      };
    }
    case AutomaticKind.ClassFeature: {
      return {
        key: `${change.kind}:${change.id}`,
        text: message('rules.timeline.automatic.feature', { name: change.name }),
      };
    }
    case AutomaticKind.CantripHeightening: {
      return {
        key: change.kind,
        text: message('rules.timeline.automatic.heightening', { rank: change.rank }),
      };
    }
    case AutomaticKind.SpellSlots: {
      const cantrips = change.rank === SlotRank.Cantrip;
      return {
        key: `${change.kind}:${change.rank}`,
        text: cantrips
          ? message('rules.timeline.automatic.cantripSlots', { count: change.count })
          : message('rules.timeline.automatic.slots', { count: change.count, rank: change.rank }),
      };
    }
    default: {
      const unreachable: never = change;
      throw new TypeError(`Unhandled automatic change: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** The automatic improvements of each level, 1 to 20, as the timeline lists them under its choices (#1683). */
export function sheetAutomatic(character: Character, content: SlotContent): readonly (readonly AutomaticLine[])[] {
  return automaticTimeline(character.document, content).map(({ changes }) =>
    changes.map((change) => ({ ...lineOf(change), source: sourceMessageOf(change.source) })),
  );
}
