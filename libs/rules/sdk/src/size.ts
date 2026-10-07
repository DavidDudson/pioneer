import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

export const Size = {
  Tiny: 'tiny',
  Small: 'small',
  Medium: 'medium',
  Large: 'large',
  Huge: 'huge',
  Gargantuan: 'gargantuan',
} as const;
export type Size = ValueOf<typeof Size>;
export const SizeSchema = z.enum(Size);
