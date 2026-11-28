import { cva } from 'class-variance-authority';

import { paddingVariants } from '../../tokens';

/**
 * What every row of a list shares (`fr-list-item`, `fr-description-item`): the padding token and the rule that
 * divides it from the next row. Neither is on by default, so a plain list looks as it always did.
 */
export const rowVariants = cva('', {
  variants: {
    padding: paddingVariants,
    divided: { true: 'not-last:border-b not-last:border-line-subtle', false: '' },
  },
  defaultVariants: { padding: 'none', divided: false },
});
