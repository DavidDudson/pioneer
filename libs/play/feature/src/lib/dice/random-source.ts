import { InjectionToken } from '@angular/core';
import { cryptoRandom } from '@pioneer/rules/dice';
import type { RandomSource } from '@pioneer/rules/dice';

/** Where solo rolls get their faces: the browser's CSPRNG. Specs provide a scripted source. */
export const RANDOM_SOURCE = new InjectionToken<RandomSource>('RANDOM_SOURCE', {
  providedIn: 'root',
  factory: (): RandomSource => cryptoRandom,
});
