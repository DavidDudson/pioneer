# 0086. Frontier colour scales are 12 steps with both modes in one token

- Status: Proposed
- Date: 2026-11-28
- Supersedes: decisions 1 and 2 of [0083](0083-frontier-primitive-tokens-are-dtcg-generated-by-terrazzo.md)

## Context

The 11-step ramps (`50` to `950`) had no meaning per step: each mode of `semantic.css` picked steps by hand and
retuned them whenever a contrast pair failed. Radix Colors names what each step is for, and ADR-0083 left open
whether a theme's numbers move into DTCG with the 12-step work.

## Decision

1. **Each role has 12 steps and 12 alpha steps**: `ramp.<role>.1` to `12` and `a1` to `a12`. Steps 1-2 are backgrounds,
   3-5 component fills, 6-8 borders, 9-10 solids, 11-12 text. An alpha step is the same step as a translucent ink over
   the page, so it lands on the opaque step.
2. **One token holds both modes.** Its value is light mode's colour and `$extensions.mode.dark` is dark mode's, in the
   default theme's hue and chroma. A step means the same in both modes, so most semantic tokens are written once.
3. **The CSS keeps hue and chroma theme-driven.** Terrazzo writes dark on `:root` and light on
   `:root[data-mode='light']`, each as `oklch(L calc(var(--fr-ramp-<role>-chroma) * k) var(--fr-ramp-<role>-hue))`,
   where `k` is the step's chroma over the role's peak. Themes stay in `src/styles/themes/` as two numbers per role;
   they do not move into DTCG.
4. **Contrast is checked against the published Radix scales.** `tools/colour-scales.test.ts` compares text steps 11 and
   12 on steps 1-3 with the matching Radix scale (sand, orange, red, grass, amber, blue) and requires 4.5:1. Hue is
   not compared. Solid steps 9-10 are darker than Radix's in light mode so white text on them reaches 4.5:1.

Alternatives: Terrazzo `permutations` needs a resolver document and gives the same output; per-mode step maps in
`semantic.css` keep the duplication this removes.

## Consequences

- Changing a mode's colour is one edit to one token; `bun run tokens` regenerates `primitives.color.css`.
- The neutral chroma parameter is `0.011`, the peak the new scale reaches. Other themes set their own.
- `semantic.css` mode blocks hold only surfaces, text on a bright solid and the fixed-hue damage and rune colours.
- Surfaces and some text colours shift a little from the 11-step ramps; `bun run check:contrast` gates every pair.
