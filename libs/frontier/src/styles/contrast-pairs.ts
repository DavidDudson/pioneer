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

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: ['fg-default', 'fg-muted', 'fg-subtle'], background: SURFACES, minimum: ContrastMinimum.Text },
  { foreground: ['fg-inverse'], background: ['surface-inverse'], minimum: ContrastMinimum.Text },
  // Links, messages and status text sit on surfaces as well as on their own subtle fill.
  ...ROLES.map((role) => ({
    foreground: [`${role}-fg`],
    background: [`${role}-subtle`, ...SURFACES],
    minimum: ContrastMinimum.Text,
  })),
  // Both fr-button's primary and danger variants use accent-on-solid, in every state.
  {
    foreground: ['accent-on-solid'],
    background: ['accent-solid', 'accent-solid-hover', 'accent-solid-active', 'danger-solid', 'danger-solid-hover'],
    minimum: ContrastMinimum.Text,
  },
  ...ROLES.map((role) => ({
    foreground: [`${role}-on-emphasis`],
    background: [`${role}-emphasis`],
    minimum: ContrastMinimum.Text,
  })),
  { foreground: ['line-focus'], background: SURFACES, minimum: ContrastMinimum.NonText },
];
