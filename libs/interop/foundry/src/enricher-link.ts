import { InlineKind } from '@pioneer/rules/sdk';
import type { ContentId, RefNode } from '@pioneer/rules/sdk';

import { inlineLabel, textRun } from './enricher-context';
import type { EnricherContext } from './enricher-context';
import type { RunNode } from './rich-text-run';

/**
 * Links to other documents: `@UUID[Compendium.pf2e.<pack>.Item.<id or name>]{label}` and the action macro
 * `[[/act <slug> ...]]{label}`. A target the import has an entry for becomes a `Ref`; any other keeps its label, or
 * Foundry's name for it, as text and is reported by pack (`@UUID[spell-effects]`).
 */

const UUID = '@UUID';
const ACT = '[[/act]]';
const SEPARATOR = '.';
/** `Compendium.pf2e.<pack>.<type>.<document>...`: the pack is the third part. */
const PACK_PART = 2;
const DOCUMENT_PART = 4;
/** Foundry document ids are 16 letters and digits; anything else in that place is a name. */
const DOCUMENT_ID = /^[A-Za-z\d]{16}$/u;
const WHITESPACE = /\s+/u;
const ASSIGNMENT = '=';

/** A link's target, and the name Foundry gives it. */
interface Target {
  readonly id: ContentId;
  readonly name: string | undefined;
}

function refRun({ id, name }: Target, label: string | undefined, context: EnricherContext): RunNode[] {
  // A label that only repeats the target's name adds nothing: the link shows the entry's own name.
  const kept = label === undefined || label.trim() === name ? undefined : inlineLabel(label, `${UUID}[label]`, context);
  const node: RefNode = {
    type: InlineKind.Ref,
    id,
    ...(kept === undefined ? {} : { label: kept }),
  };
  return [node];
}

/** The document part of a name-form UUID (`Item.Gird Champion`), which reads as a name. */
function nameInUuid(uuid: string): string | undefined {
  const document = uuid.split(SEPARATOR)[DOCUMENT_PART];
  return document === undefined || DOCUMENT_ID.test(document) ? undefined : document;
}

export function uuidRun(params: string, label: string | undefined, context: EnricherContext): RunNode[] {
  const uuid = params.trim();
  const { entries, names } = context.links;
  const id = entries.get(uuid);
  const name = names.get(uuid) ?? nameInUuid(uuid);
  if (id !== undefined) {
    return refRun({ id, name }, label, context);
  }
  context.report(`${UUID}[${uuid.split(SEPARATOR)[PACK_PART] ?? uuid}]`);
  return textRun(label ?? name, context);
}

/** `[[/act trip]]`, `[[/act escape dc=20]]`: a link to the action, its options reported by name. */
export function actRun(args: string, label: string | undefined, context: EnricherContext): RunNode[] {
  const [slug = '', ...options] = args.split(WHITESPACE);
  for (const option of options) {
    context.report(`${ACT}[${option.split(ASSIGNMENT)[0] ?? option}]`);
  }
  const { actions, actionNames } = context.links;
  const id = actions.get(slug);
  const name = actionNames.get(slug);
  if (id !== undefined) {
    return refRun({ id, name }, label, context);
  }
  context.report(ACT);
  return textRun(label ?? name ?? slug, context);
}
