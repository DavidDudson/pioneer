/** Size and colours of a story image. Hues are degrees on the colour wheel. */
export interface StoryImage {
  readonly width: number;
  readonly height: number;
  readonly fromHue: number;
  readonly toHue: number;
}

/**
 * Placeholder art for stories, inlined as an SVG data URL so Storybook needs no network or static files: a
 * diagonal gradient between two hues.
 */
export function storyImage({ width, height, fromHue, toHue }: StoryImage): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    '<defs><linearGradient id="g" x2="1" y2="1">',
    `<stop offset="0" stop-color="hsl(${fromHue} 60% 45%)"/>`,
    `<stop offset="1" stop-color="hsl(${toHue} 60% 25%)"/>`,
    '</linearGradient></defs>',
    '<rect width="100%" height="100%" fill="url(#g)"/>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A source that never loads, to show the failed state. */
export const BROKEN_IMAGE = 'data:image/png;base64,broken';
