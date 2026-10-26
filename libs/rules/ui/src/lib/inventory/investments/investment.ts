import type { BreakdownLine } from '@pioneer/rules/engine';

/** One line an invested item adds to a statistic. */
export interface InvestmentEffect {
  /** The statistic's name ("Perception"). */
  readonly statistic: string;
  readonly line: BreakdownLine;
}

/** An invested item and what it turns on. */
export interface Investment {
  /** Stable across edits: the inventory item's id. */
  readonly id: string;
  /** The player's name for it, else the content's; undefined when no loaded pack has its content. */
  readonly name: string | undefined;
  /** Whether it is worn or held as it is used, so it works. Invested but off, it still counts against the limit. */
  readonly working: boolean;
  /** Whether a battle form has it melded into the character (#532): its constant effects still apply. */
  readonly melded?: boolean | undefined;
  /** The lines it adds to the statistics the sheet shows. */
  readonly effects: readonly InvestmentEffect[];
}
