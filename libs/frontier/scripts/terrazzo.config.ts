import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';
import * as z from 'zod';

/** The extension a ramp step carries: its chroma as a fraction of its role's peak chroma. */
const RAMP_EXTENSION = 'pioneer.ramp';

const OklchComponents = z.tuple([z.number(), z.number(), z.number()]);
const RampExtension = z.object({ chromaShare: z.number() });

const RampStep = z.object({
  id: z.string(),
  $value: z.object({ components: OklchComponents }),
  $extensions: z.object({ [RAMP_EXTENSION]: RampExtension }),
});

const ScaleStep = z.object({ id: z.string(), $value: z.object({ value: z.number(), unit: z.string() }) });

type RampStep = z.infer<typeof RampStep>;

type ScaleStep = z.infer<typeof ScaleStep>;

/** `ramp.neutral.50` becomes `--fr-ramp-neutral-50`, the name the semantic tier already uses. */
const toVariableName = (token: { readonly id: string }): string => `--fr-${token.id.replaceAll('.', '-')}`;

/** The DTCG colour is the default theme's; the CSS keeps hue and chroma theme-driven. */
const rampValue = (step: RampStep): string => {
  const [lightness] = step.$value.components;
  const { chromaShare } = step.$extensions[RAMP_EXTENSION];
  const [, role] = step.id.split('.');

  return `oklch(${lightness} calc(var(--fr-ramp-${role}-chroma) * ${chromaShare}) var(--fr-ramp-${role}-hue))`;
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
    css({
      filename: 'primitives.color.css',
      include: ['ramp.**'],
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
