import { AreaShapeSchema, AreaShape, DurationCount, DurationUnit, Feet, InlineKind } from '@pioneer/rules/sdk';
import type { DurationNode, TemplateNode } from '@pioneer/rules/sdk';

import { checkRun } from './enricher-check';
import { reportParams, textRun } from './enricher-context';
import type { EnricherContext } from './enricher-context';
import { damageEnricherRun, damageRun } from './enricher-damage';
import { actRun, uuidRun } from './enricher-link';
import { EnricherForm, enricherParams, enricherParts } from './foundry-enricher';
import type { CommandEnricher, Enricher, NamedEnricher } from './foundry-enricher';
import type { RunNode } from './rich-text-run';

/**
 * Description text with Foundry's enrichers as inline nodes (content-model.md, "Foundry import"): links become
 * `Ref`s, checks, damage and areas their nodes, and inline rolls damage, a duration or text as their content
 * dictates. What does not translate keeps its label as text and is reported.
 */

const TEMPLATE = '@Template';
const TYPE = 'type';
const DISTANCE = 'distance';
const WIDTH = 'width';
/** Foundry's label repeats the area; Pioneer renders the area itself, in the reader's units. */
const TEMPLATE_HANDLED: ReadonlySet<string> = new Set([TYPE, DISTANCE, WIDTH]);
const WHOLE_NUMBER = /^\d+$/u;

/** Foundry's roll commands: public, GM-only, blind and private rolls. */
const ROLL_COMMANDS: ReadonlySet<string> = new Set(['r', 'roll', 'gmr', 'gmroll', 'br', 'broll', 'pr', 'publicroll']);
const ACT = 'act';
/** `formula # flavour`: Foundry's roll flavour follows a `#`. */
const FLAVOUR = '#';
const DAMAGE_FLAVOUR = '[';

/** A roll's flavour that names a duration (`#rounds`), by its words singular and plural. */
const DURATION_UNITS: ReadonlyMap<string, DurationUnit> = new Map([
  ['round', DurationUnit.Round],
  ['rounds', DurationUnit.Round],
  ['minute', DurationUnit.Minute],
  ['minutes', DurationUnit.Minute],
  ['hour', DurationUnit.Hour],
  ['hours', DurationUnit.Hour],
  ['day', DurationUnit.Day],
  ['days', DurationUnit.Day],
]);

function feetOf(value: string | undefined): Feet | undefined {
  return value !== undefined && WHOLE_NUMBER.test(value) ? Feet.safeParse(Number(value)).data : undefined;
}

/** A line's width; anything else with a width, or a width that is not whole feet, is reported. */
function widthOf(params: ReadonlyMap<string, string>, shape: AreaShape, context: EnricherContext): Feet | undefined {
  const width = feetOf(params.get(WIDTH));
  const isWideLine = shape === AreaShape.Line && width !== undefined;
  if (params.has(WIDTH) && !isWideLine) {
    context.report(`${TEMPLATE}[${WIDTH}]`);
  }
  return isWideLine ? width : undefined;
}

/** `@Template[cone|distance:30]`, `@Template[type:line|distance:60|width:10]` as a `Template` node. */
function templateRun(params: string, label: string | undefined, context: EnricherContext): RunNode[] {
  const parsed = enricherParams(params, TYPE);
  const type = parsed.get(TYPE) ?? '';
  const shape = AreaShapeSchema.safeParse(type);
  const size = feetOf(parsed.get(DISTANCE));
  if (!shape.success || size === undefined) {
    context.report(shape.success ? `${TEMPLATE}[${DISTANCE}]` : `${TEMPLATE}[${TYPE}:${type}]`);
    return textRun(label ?? `${parsed.get(DISTANCE) ?? ''}-foot ${type}`, context);
  }
  reportParams(parsed, { enricher: TEMPLATE, handled: TEMPLATE_HANDLED }, context);
  const width = widthOf(parsed, shape.data, context);
  const node: TemplateNode = {
    type: InlineKind.Template,
    shape: shape.data,
    size,
    ...(width === undefined ? {} : { width }),
  };
  return [node];
}

/** A fixed number of rounds, minutes, hours or days, or undefined for anything else. */
function durationOf(formula: string, flavour: string): DurationNode | undefined {
  const unit = DURATION_UNITS.get(flavour.toLowerCase());
  const count = WHOLE_NUMBER.test(formula) ? DurationCount.safeParse(Number(formula)).data : undefined;
  return unit === undefined || count === undefined ? undefined : { type: InlineKind.Duration, count, unit };
}

/**
 * `[[/r 2d6[fire]]]` is damage and `[[/r 1 #minute]]` a duration. Any other roll (`[[/r 1d4 #rounds]]`, a
 * counteract modifier) reads as its label, else its formula: there is no node for a roll yet.
 */
function rollRun(args: string, label: string | undefined, context: EnricherContext): RunNode[] {
  const hash = args.indexOf(FLAVOUR);
  const formula = (hash === -1 ? args : args.slice(0, hash)).trim();
  const flavour = hash === -1 ? '' : args.slice(hash + 1).trim();
  if (formula.includes(DAMAGE_FLAVOUR)) {
    return damageRun(formula, label, context);
  }
  const duration = durationOf(formula, flavour);
  return duration === undefined ? textRun(label ?? formula, context) : [duration];
}

function namedRun({ name, params, label }: NamedEnricher, context: EnricherContext): RunNode[] {
  switch (name) {
    case 'UUID': {
      return uuidRun(params, label, context);
    }
    case 'Check': {
      return checkRun(params, label, context);
    }
    case 'Damage': {
      return damageEnricherRun(params, label, context);
    }
    case 'Template': {
      return templateRun(params, label, context);
    }
    default: {
      // `@Embed` pulls in another document's text and `@Localize` a lang entry: neither is text of this one.
      context.report(`@${name}`);
      return textRun(label, context);
    }
  }
}

function commandRun({ command, args, label }: CommandEnricher, context: EnricherContext): RunNode[] {
  if (command === ACT) {
    return actRun(args, label, context);
  }
  if (ROLL_COMMANDS.has(command)) {
    return rollRun(args, label, context);
  }
  context.report(`[[/${command}]]`);
  return textRun(label ?? args, context);
}

function enricherRun(enricher: Enricher, context: EnricherContext): RunNode[] {
  return enricher.form === EnricherForm.Named ? namedRun(enricher, context) : commandRun(enricher, context);
}

/** Description text as a run, each enricher in it translated. */
export function enrichedRun(text: string, context: EnricherContext): RunNode[] {
  return enricherParts(text).flatMap((part) =>
    typeof part === 'string' ? textRun(part, context) : enricherRun(part, context),
  );
}
