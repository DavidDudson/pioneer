import { Size } from '@pioneer/rules/sdk';

export const SIZE_MESSAGES: Readonly<Record<Size, string>> = {
  [Size.Tiny]: 'rules.build.size.tiny',
  [Size.Small]: 'rules.build.size.small',
  [Size.Medium]: 'rules.build.size.medium',
  [Size.Large]: 'rules.build.size.large',
  [Size.Huge]: 'rules.build.size.huge',
  [Size.Gargantuan]: 'rules.build.size.gargantuan',
};
