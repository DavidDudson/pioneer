import { InlineKind, InlineLabel } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import type { Marks, RunNode } from './rich-text-run';

/** What translating an enricher needs: the entries links can point to, the marks around it, and a place to report. */

/** Imported entries and Foundry names, for `@UUID` links and `[[/act]]` macros (`foundryLinks`). */
export interface FoundryLinks {
  /** Imported entries by the compendium UUIDs that name them, by document id and by document name. */
  readonly entries: ReadonlyMap<string, ContentId>;
  /** Foundry's name for every item document in the release, by the same UUIDs. */
  readonly names: ReadonlyMap<string, string>;
  /** Imported actions by Foundry slug (`trip`), for `[[/act trip]]`. */
  readonly actions: ReadonlyMap<string, ContentId>;
  /** Every action's Foundry name by its slug, for an action outside the import. */
  readonly actionNames: ReadonlyMap<string, string>;
}

/** No entries and no names: every link stays text. */
export const NO_LINKS: FoundryLinks = {
  entries: new Map(),
  names: new Map(),
  actions: new Map(),
  actionNames: new Map(),
};

export interface EnricherContext {
  readonly links: FoundryLinks;
  readonly marks: Marks;
  /** Records an enricher, or a part of one, that could not be translated (`@Check[traits]`, `@UUID[journals]`). */
  readonly report: (problem: string) => void;
}

/** `text` as a run piece with the surrounding marks; nothing for empty text. */
export function textRun(text: string | undefined, { marks }: EnricherContext): RunNode[] {
  return text === undefined || text === '' ? [] : [{ type: InlineKind.Text, text, marks }];
}

/** A Foundry `{label}` as an inline label; reported under `problem` and left out when it does not fit one. */
export function inlineLabel(
  label: string | undefined,
  problem: string,
  context: EnricherContext,
): InlineLabel | undefined {
  if (label === undefined) {
    return undefined;
  }
  const parsed = InlineLabel.safeParse(label.trim());
  if (!parsed.success) {
    context.report(problem);
  }
  return parsed.data;
}

/** An enricher's name and the parameters it translates or deliberately ignores. */
export interface EnricherParams {
  readonly enricher: string;
  readonly handled: ReadonlySet<string>;
}

/** Reports each parameter that is neither translated nor deliberately ignored, as `<enricher>[<param>]`. */
export function reportParams(
  params: ReadonlyMap<string, string>,
  { enricher, handled }: EnricherParams,
  context: EnricherContext,
): void {
  for (const key of params.keys()) {
    if (!handled.has(key)) {
      context.report(`${enricher}[${key}]`);
    }
  }
}
