/** Published colour-science constants used by ./token-contrast.ts. */

/** OKLab (a, b) to LMS, per cone; lightness adds to each. Björn Ottosson's matrix, as in CSS Color 4. */
export const OKLAB_TO_LMS = [
  [0.3963377774, 0.2158037573],
  [-0.1055613458, -0.0638541728],
  [-0.0894841775, -1.291485548],
] as const;

/** Cubed LMS to linear-light sRGB (red, green, blue rows). */
export const LMS_TO_LINEAR_SRGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
] as const;

/** WCAG 2 relative luminance weights for linear red, green and blue. */
export const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;

/** WCAG 2's allowance for viewing flare, added to both luminances. */
export const FLARE = 0.05;

/** `100%` chroma in `oklch()` (CSS Color 4). */
export const OKLCH_FULL_CHROMA = 0.4;

/** OKLab's LMS nonlinearity is a cube root, so going back to LMS cubes. */
export const CUBE = 3;
