import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';
import * as z from 'zod';

import sourceTokens from '../src/tokens/primitives.tokens.json' with { type: 'json' };

/**
 * A ramp step is written once and holds both modes: its own value is light mode's colour (and alpha, for an alpha
 * step), and `$extensions.mode.dark` holds dark mode's. Chroma is stored as the default theme's, and the CSS writes
 * it as a share of the role's peak so a theme can set that peak.
 */
const OklchComponents = z.tuple([z.number(), z.number(), z.number()]);

const RampStep = z.object({
  id: z.string(),
  $value: z.object({ components: OklchComponents, alpha: z.number().optional() }),
});

/** `a3` is the alpha variant of step 3. */
const ALPHA_STEP = /^a\d+$/u;

const ScaleStep = z.object({ id: z.string(), $value: z.object({ value: z.number(), unit: z.string() }) });

const Colour = z.object({ components: OklchComponents });

const SourceStep = z.object({ $value: Colour, $extensions: z.object({ mode: z.object({ dark: Colour }) }) });

type SourceStep = z.infer<typeof SourceStep>;

/** The source file's ramp group: each role's steps, with the dark colour under `$extensions.mode`. */
const RoleSteps = z.record(z.string(), SourceStep);

const RampGroup = z.object({ ramp: z.object({ $type: z.string() }).catchall(RoleSteps) });

type RampStep = z.infer<typeof RampStep>;

type ScaleStep = z.infer<typeof ScaleStep>;

/** `ramp.neutral.50` becomes `--fr-ramp-neutral-50`, the name the semantic tier already uses. */
const toVariableName = (token: { readonly id: string }): string => `--fr-${token.id.replaceAll('.', '-')}`;

const CHROMA_DIGITS = 4;

/** A role's peak chroma: the largest of its opaque steps, in either mode. A theme's chroma replaces it. */
const peakChroma = (steps: ReadonlyArray<SourceStep>): number =>
  Math.max(...steps.flatMap((step) => [step.$value.components[1], step.$extensions.mode.dark.components[1]]));

const { $type: _type, ...sourceRamp } = RampGroup.parse(sourceTokens).ramp;

const opaqueSteps = (steps: Readonly<Record<string, SourceStep>>): Array<SourceStep> =>
  Object.entries(steps).flatMap(([name, step]) => (ALPHA_STEP.test(name) ? [] : [step]));

const roles = Object.entries(sourceRamp).map(([role, steps]): [string, number] => [
  role,
  peakChroma(opaqueSteps(steps)),
]);

const PEAK_CHROMA: Readonly<Record<string, number>> = Object.fromEntries(roles);

/**
 * One mode's colour: its lightness, its chroma as a share of the role's peak, and the theme's hue. The DTCG value
 * is the default theme's; for dark, Terrazzo passes the dark mode's value in its place.
 */
const rampValue = (step: RampStep): string => {
  const [lightness, chroma] = step.$value.components;
  const [, role = '', name = ''] = step.id.split('.');
  const chromaShare = Number((chroma / (PEAK_CHROMA[role] ?? chroma)).toFixed(CHROMA_DIGITS));
  // Terrazzo gives every colour an alpha of 1; only an alpha step (`a1`..`a12`) writes one.
  const { alpha } = step.$value;
  const opacity = ALPHA_STEP.test(name) && alpha !== undefined ? ` / ${alpha}` : '';

  return `oklch(${lightness} calc(var(--fr-ramp-${role}-chroma) * ${chromaShare}) var(--fr-ramp-${role}-hue)${opacity})`;
};

/** A zero length is unitless, so write it as `0`. */
const scaleValue = (step: ScaleStep): string => {
  const { value, unit } = step.$value;

  return value === 0 ? '0' : `${value}${unit}`;
};

// Terrazzo loads its config from the default export.
// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  tokens: ['./libs/frontier/src/tokens/primitives.tokens.json'],
  outDir: './libs/frontier/src/styles/',
  plugins: [
    /*
     * Light is the base value of every step and dark is its `mode`. Dark is the default theme mode, on plain :root, and
     * light sits under its mode attribute (semantic.css), so a step's name means the same in both. Terrazzo's other
     * route, `permutations`, needs a resolver document for what one `modeSelectors` entry says.
     */
    css({
      filename: 'primitives.color.css',
      include: ['ramp.**'],
      // oxlint-disable-next-line typescript/no-deprecated
      baseSelector: ":root[data-mode='light']",
      // oxlint-disable-next-line typescript/no-deprecated
      modeSelectors: [{ mode: 'dark', selectors: [':root'] }],
      variableName: toVariableName,
      transform: (token) => rampValue(RampStep.parse(token)),
    }),
    css({
      filename: 'primitives.scale.css',
      include: ['scale.**'],
      variableName: toVariableName,
      transform: (token) => scaleValue(ScaleStep.parse(token)),
    }),
  ],
});
