/**
 * Foreground/background token pairs that must stay readable, checked in every theme × colour mode by
 * `bun run check:contrast` (tools/check-token-contrast.ts). Names are semantic tokens without `--fr-`.
 *
 * Ratios are WCAG 2 contrast, the measure axe applies in the story tests: 4.5:1 for text (1.4.3), 3:1 for
 * non-text such as the focus ring (1.4.11). `fg-disabled` has no pair: disabled text is exempt.
 *
 * Add a pair when a component puts a new foreground on a new background.
 */
const ContrastMinimum = { Text: 4.5, NonText: 3 } as const;

interface ContrastPair {
  readonly foreground: readonly string[];
  readonly background: readonly string[];
  readonly minimum: number;
}

const SURFACES = ['surface-canvas', 'surface-base', 'surface-raised', 'surface-sunken', 'surface-overlay'];
const STATUSES = ['danger', 'success', 'warning', 'info'];
const ROLES = ['accent', ...STATUSES];
const RUNE_TIERS = ['rune-base', 'rune-greater', 'rune-major', 'rune-mythic'];
const DAMAGE_TONES = [
  'physical',
  'holy',
  'fire',
  'cold',
  'electricity',
  'acid',
  'poison',
  'sonic',
  'force',
  'mental',
  'void',
  'vitality',
  'spirit',
  'bleed',
];

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: ['fg-default', 'fg-muted', 'fg-subtle'], background: SURFACES, minimum: ContrastMinimum.Text },
  { foreground: ['fg-inverse'], background: ['surface-inverse'], minimum: ContrastMinimum.Text },
  // A combobox option's description, on the selected option's fill.
  { foreground: ['fg-subtle'], background: ['accent-subtle'], minimum: ContrastMinimum.Text },
  // Links, messages and status text sit on surfaces as well as on their own subtle fill.
  ...ROLES.map((role) => ({
    foreground: [`${role}-fg`],
    background: [`${role}-subtle`, ...SURFACES],
    minimum: ContrastMinimum.Text,
  })),
  // Solid fills (fr-button's primary and danger variants), in every state.
  ...ROLES.map((role) => ({
    foreground: [`${role}-on-solid`],
    background: [`${role}-solid`, `${role}-solid-hover`, `${role}-solid-active`],
    minimum: ContrastMinimum.Text,
  })),
  ...ROLES.map((role) => ({
    foreground: [`${role}-on-emphasis`],
    background: [`${role}-emphasis`],
    minimum: ContrastMinimum.Text,
  })),
  // A roll's total and dice, coloured by damage type, on the surfaces and the roll toast.
  { foreground: DAMAGE_TONES.map((tone) => `damage-${tone}`), background: SURFACES, minimum: ContrastMinimum.Text },
  // A rune gem's glyph on its tier fill, and the fill against the surfaces it sits on.
  { foreground: ['on-rune'], background: RUNE_TIERS, minimum: ContrastMinimum.Text },
  { foreground: RUNE_TIERS, background: SURFACES, minimum: ContrastMinimum.NonText },
  { foreground: ['line-focus'], background: SURFACES, minimum: ContrastMinimum.NonText },
];
