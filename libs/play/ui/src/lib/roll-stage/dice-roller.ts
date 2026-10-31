// oxlint-disable-next-line typescript/triple-slash-reference -- the package ships no types; every build that loads this file must see its declaration
/// <reference path="./dice-box-threejs.d.ts" />
import { InjectionToken } from '@angular/core';
import type { DamageTone } from '@pioneer/frontier';

import type { DiceGroup } from './roll-presentation';

/** Throws dice across a surface; the faces they land on come with the groups, never from the roller. */
export interface DiceRoller {
  /** Resolves when every die has settled. */
  readonly roll: (groups: readonly DiceGroup[]) => Promise<void>;
  /** Removes the canvas and frees the graphics context. */
  readonly dispose: () => void;
}

/** Starts a roller drawing into `surface`; loads the dice library on first use. */
export type DiceRollerFactory = (surface: HTMLElement) => Promise<DiceRoller>;

/** The CSS custom property holding a damage tone's colour, and the one an untyped roll uses. */
const TONE_PROPERTIES: Readonly<Record<DamageTone, string>> = {
  physical: '--fr-damage-physical',
  holy: '--fr-damage-holy',
  fire: '--fr-damage-fire',
  cold: '--fr-damage-cold',
  electricity: '--fr-damage-electricity',
  acid: '--fr-damage-acid',
  poison: '--fr-damage-poison',
  sonic: '--fr-damage-sonic',
  force: '--fr-damage-force',
  mental: '--fr-damage-mental',
  void: '--fr-damage-void',
  vitality: '--fr-damage-vitality',
  spirit: '--fr-damage-spirit',
  bleed: '--fr-damage-bleed',
};
const UNTYPED_PROPERTY = '--fr-fg-default';
const DARK_NUMERALS = '#111111';
const LIGHT_NUMERALS = '#ffffff';
const LIGHTNESS_SPLIT = 150;
const RED_WEIGHT = 0.299;
const GREEN_WEIGHT = 0.587;
const BLUE_WEIGHT = 0.114;
const PIXEL = 1;
const HEX_RADIX = 16;
const HEX_DIGITS = 2;

function part(value: number): string {
  return value.toString(HEX_RADIX).padStart(HEX_DIGITS, '0');
}

interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/** Any CSS colour (the tokens are `oklch()`) as red, green and blue, by painting one pixel; black if it does not parse. */
function toRgb(colour: string): Rgb {
  const canvas = document.createElement('canvas');
  canvas.width = PIXEL;
  canvas.height = PIXEL;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) {
    return { red: 0, green: 0, blue: 0 };
  }
  context.fillStyle = colour;
  context.fillRect(0, 0, PIXEL, PIXEL);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, PIXEL, PIXEL).data;
  return { red, green, blue };
}

function toHex({ red, green, blue }: Rgb): string {
  return `#${part(red)}${part(green)}${part(blue)}`;
}

/** A custom colour set for the dice library: body, numerals and no outline or texture. */
interface DiceColorSet {
  readonly name: string;
  readonly foreground: string;
  readonly background: string;
  readonly outline: string;
  readonly texture: string;
  readonly material: string;
}

/** The dice colour set for a tone: the token's colour for the body, black or white numerals for contrast. */
function colorSetFor(tone: DamageTone | undefined): DiceColorSet {
  const property = tone === undefined ? UNTYPED_PROPERTY : TONE_PROPERTIES[tone];
  const value = getComputedStyle(document.documentElement).getPropertyValue(property);
  const rgb = toRgb(value);
  const brightness = rgb.red * RED_WEIGHT + rgb.green * GREEN_WEIGHT + rgb.blue * BLUE_WEIGHT;
  const numerals = brightness > LIGHTNESS_SPLIT ? DARK_NUMERALS : LIGHT_NUMERALS;
  const background = toHex(rgb);
  return {
    name: `pio-${tone ?? 'untyped'}-${background}`,
    foreground: numerals,
    background,
    outline: 'none',
    texture: 'none',
    material: 'plastic',
  };
}

let surfaceCount = 0;

/**
 * The Three.js dice, loaded on the first roll so the library stays out of the initial bundle (ADR-0074). Every group is
 * thrown as one notation (`1d8@6+1d6@6`) in one colour, the first damage type among them: the library cannot colour
 * dice in one throw separately, and adding dice to a throw in the air never settles. The toast names every type.
 */
export const threeDiceRoller: DiceRollerFactory = async (surface) => {
  const { default: DiceBox } = await import('@3d-dice/dice-box-threejs');
  surfaceCount += 1;
  surface.id = `pio-dice-surface-${surfaceCount}`;
  const box = new DiceBox(`#${surface.id}`, { sounds: false, shadows: false });
  await box.initialize();
  return {
    roll: async (groups) => {
      const tone = groups.find((group) => group.tone !== undefined)?.tone;
      await box.updateConfig({ theme_customColorset: colorSetFor(tone), theme_material: 'plastic' });
      await box.roll(groups.map(({ notation }) => notation).join('+'));
    },
    dispose: () => {
      box.clearDice();
      box.renderer.dispose();
      box.renderer.forceContextLoss();
      box.renderer.domElement.remove();
    },
  };
};

export const DICE_ROLLER_FACTORY = new InjectionToken<DiceRollerFactory>('DICE_ROLLER_FACTORY', {
  providedIn: 'root',
  factory: (): DiceRollerFactory => threeDiceRoller,
});
