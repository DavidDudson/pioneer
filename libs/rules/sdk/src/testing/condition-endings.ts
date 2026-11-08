import type { ConditionChange, ConditionEnding, ConditionTrigger } from '../condition';
import { RichText } from '../rich-text';

/** An automatic ending that does `change` at `trigger`, with a one-line rule text. */
export function automaticEnding(trigger: ConditionTrigger, change: ConditionChange): ConditionEnding {
  return {
    kind: 'automatic',
    trigger,
    change,
    text: RichText.parse([
      { type: 'paragraph', content: [{ type: 'text', text: `At ${trigger}: ${change.effect}.` }] },
    ]),
  };
}
